/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global $, window, location, CSInterface, SystemPath, themeManager*/

'use strict';
jsx.file('./host/stinovac_decoupled.jsx');

//cs interface used for communication with photoshop
const csInterface = new CSInterface();
const extensionRootPath = csInterface.getSystemPath(SystemPath.EXTENSION);
console.log("the path is " + extensionRootPath);

//Turn persistence on
//let event = new CSEvent("com.adobe.PhotoshopPersistent", "APPLICATION");
let event = new CSEvent("com.adobe.PhotoshopUnPersistent", "APPLICATION");
const gExtensionId = "com.metlickaj.shadower";
event.extensionId = gExtensionId;
csInterface.dispatchEvent(event);

//theme manager to switch between dark mode and light mode
themeManager.init();

//node.js imports
const fs = require('fs');
const os = require('os');
const https = require('https');
// checkForNewVersion();

//name of folder for storing of thumbnails
const THUMBNAIL_FOLDER_NAME = ".shadow";

//jmeno temp souboru, ktery drzi aktualni stin a cibule
const SHADOW_DOCUMENT_NAME = "stinovani";
const PSD_TO_PNG_EXE = "psdtopng.exe";
const THUMBNAILS_WIDTH_PX = 250;
const CONVERSION_THREADS = Math.max((os.cpus().length / 2) - 1, 1);
console.log(`Will use only ${CONVERSION_THREADS} threads for conversion`);

//initialize horizontally scrolling thumbnail list
const FRAME_ID = "#frame";
const $WRAP = $(FRAME_ID).parent();
const $SLIDES = $('#slides');
const $FILE_PICKER = $('#file-picker');
//current folder in which we work
let currentWorkingFolder = null;
let documentDimensions = null;
let includePreviousPhase = null;
let isPreview = false;

let taskToGenerateThumbnails = null;

const sly = new Sly(FRAME_ID, {
    horizontal: 1,
    itemNav: 'basic',
    smart: 0,
    activateMiddle: 0,
    activateOn: 'click',
    mouseDragging: 1,
    touchDragging: 1,
    releaseSwing: 0,
    scrollBy: 1,
    scrollBar: $WRAP.find('.scrollbar'),
    speed: 300,
    elasticBounds: 0,
    easing: 'swing',
    dragHandle: 1,
    dynamicHandle: 1,
    minHandleSize: 50,
    clickBar: 1,
    startAt: 0,
    syncSpeed: 1,
    keyboardNavBy: "items"
});
sly.init();

//nastavuje "previous" class na policko vedle "active", kdykoliv se active zmeni.
sly.on('active', actOnSelectedField);

//nastavi jestli se vklada predchozi policko
setIncludePreviousPhase();

// Po otevření photoshopu - zkontroluje se, jestli je shadower auto-intercept zapnutý.
//Pokud ano, tak:
if (getShadowerStatus()) {
    // Pokud je otevřený obrázek, nebo po otevření libovolného obrázku:
    jsx.evalScript("app.documents.length", isOpenFile);
}

// po otevření libovolného obrázku se zkontroluje následující:

// Je ve stejném adresáři jako obrázek adresář ".shadow?
// Pokud ano, tak se pokusím pro všechny soubory v adresáři načíst .png soubor.
// Pokud .png soubor existuje, tak porovnám date modified s date modified psd dokumentu.
// Pokud je .png starší než .psd, tak vytvořím nový .png dokument.
// Pokud .png soubor neexistuje, tak ho vytvořím.

// Pokud je auto-intercept vypnutý, nic se neděje.
// Nastavení autointerceptu (po jeho přepnutí) se ukládá do local cache.

//Program entrypoint aktivovaný po "otevření" či "překliknutí" na dokument
csInterface.addEventListener("documentAfterActivate", getActiveDocument);
csInterface.addEventListener("documentAfterDeactivate", getActiveDocument);

csInterface.addEventListener("documentAfterSave", getSavedDocument);

//current folder button
const $sheetButton = $('#working-folder');


function setDocumentDimensions(jsonDimensions) {
    console.log(jsonDimensions);
    documentDimensions = JSON.parse(jsonDimensions);
    console.log("width: " + documentDimensions.widthPx, "height: " + documentDimensions.heightPx);
}

function getShadowerStatus() {
    let status = localStorage.getItem("enabled") == "true";
    $("#shadowerEnabledSwitch").prop("checked", status);
    console.log("shadower enabled in localstorage: " + status);
    return status;
}

function setShadowerStatus(isEnabled) {
    localStorage.setItem("enabled", isEnabled == true ? "true" : "");
    console.log("shadower enabled set to: " + isEnabled);
    if (getShadowerStatus()) {
        jsx.evalScript("app.documents.length", isOpenFile);
    } else {
        currentWorkingFolder = null;
        emptySlides();
    }
}

function isOpenFile(numberOfOpenFiles) {
    //pokud je otevřený obrázek
    if (numberOfOpenFiles > 0) {
        //tak zkontroluj jestli je to platna faze
        jsx.evalScript(`getPathOfActiveDocument('${SHADOW_DOCUMENT_NAME}')`, isValidFileName);
    } else {
        $WRAP.css('visibility', 'hidden');
        $FILE_PICKER.css('visibility', 'visible');
    }
}

// Má obrázek v názvu slovo "FAZE"? Pokud ano, tak
function isValidFileName(filePath) {
    $FILE_PICKER.css('visibility', 'hidden');
    $WRAP.css('visibility', 'visible');
    console.log("hele :" + filePath);
    filePath = filePath.replace(/\\/g, "/");
    //pokud je otevreny temp soubor shadoweru
    console.log(filePath);
    if (filePath == SHADOW_DOCUMENT_NAME) {
        //tak asi uz delam shadowing a neni treba delat nove nahledy
        console.log("is the temp file for shadower");
        return;
    }
    if (filePath.toString().toUpperCase().indexOf("_FAZE_") != -1) {
        let folderPath = getWinPathFromESPath(filePath);
        jsx.evalScript('getDocumentDimensionsPx()', setDocumentDimensions);
        if (folderPath == currentWorkingFolder) {
            //pokud je folderpath identická s currentWorkingFolder, tak uz mame thumbnails a nic nedelame.
            return;
        }
        //ulož folderPath do pomocné globální proměnné - bude se používat pro kontrolu dalších otevíraných souborů.
        currentWorkingFolder = folderPath;
        //Načíst soubory z adresáře do stínovače.
        populateSlidesFromWinFolderPath(currentWorkingFolder);
        //Zkontrolovat thumbnails
        createThumbnails();
    }
}

//from 'C:/Users/krisn/Desktop/testy/test a ž č/tisk01_FAZE_001.psd' to 'C:/Users/krisn/Desktop/testy/test a ž č/'
function getWinPathFromESPath(path) {
    return path.substring(0, path.lastIndexOf("/"));
}

function populateSlidesFromWinFolderPath(winPath) {
    //extract files existing in the folder.
    let files = window.cep.fs.readdir(winPath);
    if (files.err) {
        // do nothing.
    } else {
        // Array of the filenames (without path)
        let fileNames = files.data;
        populateSlides(filterFileNames(fileNames), winPath);
    }
}

function getActiveDocument() {
    //pokud je stinovac zapnuty
    if (!getShadowerStatus()) {
        return;
    }
    console.log("intercepted activation of a new document");
    //pokud je zrovna aktivovaný obrázek .psd
    jsx.evalScript(`getPathOfActiveDocument('${SHADOW_DOCUMENT_NAME}')`, isValidFileName);
}

function getSavedDocument(event) {
    //Tady se bude muset obnovovat thumbnail pro ten jeden soubor, co se zrovna uložil.
}

//vyčistí slides a reloadne je, aby se aktualizoval scrollbar
function emptySlides() {
    $SLIDES.empty();
    sly.reload();
}

function populateSlides(fileNames, folder) {
    //empty slides
    emptySlides();
    fileNames.forEach(fileName => {
        let fileInfo = fs.statSync(folder + "/" + fileName);
        //Populate thumbnails.
        $(
            `<li>
                <div class="slideframe">
                    <div class="imageholder">
                        <img>
                        <div class="static-button">
                        <button id="toggle-pinned" class="topcoat-button" title="Připnout/odepnout statickou fázi" onclick="togglePinned(this)"><i class="fas fa-thumbtack"></i></button>
                        </div>
                    </div>
                    <div class="filename">
                        ${fileName}
                    </div>
                </div>
            </li>`
        ).attr({
            id: stripExtension(fileName),
            title: fileName,
        })
            .attr("folder", folder)
            .attr("fileName", fileName)
            .appendTo($SLIDES);
    });
    sly.reload();
}

function extractPathFromEvent(event) {
    let xmlData = event.data.toString();
    let startOfPath = xmlData.lastIndexOf("<url>") + 13;
    let endOfPath = xmlData.lastIndexOf("</url>");
    return xmlData.substring(startOfPath, endOfPath);
}

function pathToWinFormat(forwardSlashPath) {
    let newPath = forwardSlashPath.replace(/\//g, "\\");
    return newPath;
}

function stripExtension(fileName) {
    return fileName.substring(0, fileName.toUpperCase().lastIndexOf("."));
}

function filterFileNames(fileNames) {
    return fileNames.filter((filename) => {
        return filename.toUpperCase().lastIndexOf(".PSD") == filename.length - 4
            && filename.toUpperCase().indexOf("FAZE") != -1
    });
}

//Create new thumbnails
function createThumbnails() {
    let exec = require('child_process').exec;
    let pathToProgram = extensionRootPath + "/" + PSD_TO_PNG_EXE;
    let commandToExec = `"${pathToProgram}" "${pathToWinFormat(currentWorkingFolder)}" "${THUMBNAIL_FOLDER_NAME}" ${THUMBNAILS_WIDTH_PX} ${CONVERSION_THREADS}`;
    if (taskToGenerateThumbnails != null) {
        console.log("already generating thumbnails");
        return;
    }
    taskToGenerateThumbnails = setInterval(refreshThumbnails, 1000);
    exec(commandToExec,
        (error, stdout, stderr) => {
            console.log(error);
            console.log(stdout);
            console.log(stderr);
            clearInterval(taskToGenerateThumbnails);
            taskToGenerateThumbnails = null;
            refreshThumbnails();
        });
}

function refreshThumbnails() {
    console.log("Refreshing thumbnails");
    $SLIDES.find("li").each(function (index, element) {
        let $this = $(element);
        let fileName = $this.attr("fileName");
        let pngFilePath = getThumbnailFilePath(fileName)
        if (fs.existsSync(pngFilePath)) {
            $this.find("img").attr("src", "file://" + pngFilePath + "?" + fs.statSync(pngFilePath).mtime.getTime());
        }
    });
}

function getThumbnailFilePath(psdFileName) {
    return currentWorkingFolder + "/" + THUMBNAIL_FOLDER_NAME + "/" + stripExtension(psdFileName) + ".png";
}

function openSlideForShadowing() {
    isPreview = false;
    let $currentSlide = $SLIDES.find(".active");
    properlyMarkPrevious();
    let $previousSlide = $SLIDES.find(".previous");
    let $pinnedSlide = $SLIDES.find('.pinned:not(".active")');
    let currentFilePath = getPSDFilePathFromSlide($currentSlide);
    let previousFilePath = getPSDFilePathFromSlide($previousSlide);
    let pinnedFilePath = getPSDFilePathFromSlide($pinnedSlide);
    //In case pinned and previous overlap, we want only previous
    if (pinnedFilePath == previousFilePath) {
        pinnedFilePath = undefined;
    }
    let obj = {
        'shadowDocumentName': SHADOW_DOCUMENT_NAME,
        'currentFile': {
            path: currentFilePath,
            prep: "top",
            opacity: 85
        },
        'previousFile': {
            path: previousFilePath,
            prep: "prev",
            opacity: 40
        },
        'pinnedFile': {
            path: pinnedFilePath,
            prep: "pin",
            opacity: 20
        },
        'dimensionsInPx': documentDimensions
    }
    console.log("current: " + currentFilePath);
    console.log("previous: " + previousFilePath);
    console.log("pinned: " + pinnedFilePath);

    jsx.evalScript(`shadowFromCurrentPreviousAndPinned(${JSON.stringify(obj)})`, doPostOpenActions);
}

function openPreviousSlideForShadowing() {
    let $currentSlide = $SLIDES.find(".active");
    let $previousSlide = $currentSlide.prevAll('li').first();
    if ($previousSlide.length != 0) {
        $currentSlide.removeClass("active");
        $previousSlide.addClass("active");
    }
    openSlideForShadowing();
}

function openNextSlideForShadowing() {
    let $currentSlide = $SLIDES.find(".active");
    let $nextSlide = $currentSlide.nextAll('li').first();
    if ($nextSlide.length != 0) {
        $currentSlide.removeClass("active");
        $nextSlide.addClass("active");
    }
    openSlideForShadowing();
}

//returns path to slide.
function getPSDFilePathFromSlide($slide) {
    if ($slide.length) {
        return $slide.attr("folder").toString() + "/" + $slide.attr("fileName").toString();
    }
    return undefined;
}

//sets the pinned image
function togglePinned(button) {
    let $pinButton = $(button);
    let $toggledSlide = $pinButton.closest("li");
    if ($toggledSlide.hasClass("pinned")) {
        $toggledSlide.removeClass("pinned")
    } else {
        $SLIDES.find(".pinned").removeClass("pinned");
        $toggledSlide.addClass("pinned")
    }
    //put "previous" to proper place!
    properlyMarkPrevious();
}

function actOnSelectedField() {
    $("#open-selected")[0].disabled = false;
    $("#open-selected").attr('data-original-title', "Otevře aktuálně označenou fázi pro stínování");
    let $activeSlides = $SLIDES.find(".active");
    //todo: this is a messy hack to fix the issue when the first slide is selected as "active" by "previous-button" and then when clicking on other slide
    //this first slide stays active. Here we manually check whether it got stuck and we remove from it manually the class!
    if ($activeSlides.length > 1) {
        $activeSlides.first().removeClass("active");
    }
    properlyMarkPrevious();
}

function properlyMarkPrevious() {
    $SLIDES.find(".previous").removeClass("previous");
    if (includePreviousPhase == true) {
        $SLIDES.find(".active").prevAll('li').first().addClass("previous");
    }
}

function tryPopulateSlides(event) {
    let filePath = extractPathFromEvent(event);
    currentWorkingFolder = filePath.substring(0, filePath.lastIndexOf("/"));
    // Try to fill the slides if empty.
    if ($SLIDES.children().length != 0) {
        return;
    }
    //extract files existing in the folder.
    let files = window.cep.fs.readdir(currentWorkingFolder);
    if (files.err) {
        // do nothing.
    } else {
        // Array of the files (without path)
        let fileNames = files.data;
        let filteredFileNames = filterFileNames(fileNames);
        filteredFileNames.sort();
        //localStorage.setItem('persistedSheets', JSON.stringify(filteredFileNames));
        localStorage.setItem('workingFolder', JSON.stringify(currentWorkingFolder));
        populateSlides(filteredFileNames, currentWorkingFolder);
    }
}

function setIncludePreviousPhase() {
    includePreviousPhase = $('#includePrevious')[0].checked;
    properlyMarkPrevious();
}

function toggleFinalView() {
    isPreview = !isPreview;
    jsx.evalScript('toggleFinalPreview(' + isPreview + ')')
}

function doPostOpenActions(json) {
    console.log("doing post-open shit");
    enableBackwardForwardButtons();
    enablePreviewButton();
    createThumbnails();
}

function enableBackwardForwardButtons() {
    $("#open-next")[0].disabled = false;
    $("#open-next").attr('data-original-title', "Přesun na další fázi");

    $("#open-previous")[0].disabled = false;
    $("#open-previous").attr('data-original-title', "Přesun na předchozí fázi");
}

function enablePreviewButton(json) {
    $("#shadow-preview")[0].disabled = false;
    $("#shadow-preview").attr('data-original-title', "Přepnout mezi finální fází se šedivým stínem a červeným náhledem");
}

function checkForNewVersion() {
    https.get('https://metlicka.eu/shadower/version.txt', (resp) => {
        let data = '';

        // A chunk of data has been received.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            if (getVersion() < data) {
                console.log(`there is a newer version available: ${data}`);
                downloadNewVersion(data);
            }
        });

    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

function downloadNewVersion(newVersion) {
    https.get('https://metlicka.eu/shadower/phaserSetup.exe', (resp) => {
        resp.setEncoding('binary')
        let data = '';

        // A chunk of data has been received.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            let filePath = extensionRootPath + "/../phaserSetup" + newVersion + ".exe";
            fs.writeFileSync(filePath, data, 'binary');

            let exec = require('child_process').exec;
            exec(`"${filePath}"`,
                (error, stdout, stderr) => {
                    console.log(error);
                    console.log(stdout);
                    console.log(stderr);
                });
        });

    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

function getVersion() {
    return "2.0.4";
}