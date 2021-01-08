/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global $, window, location, CSInterface, SystemPath, themeManager*/

//name of folder for storing of thumbnails
const thumbnailFolderName = ".shadow";

//jmeno temp souboru, ktery drzi aktualni stin a cibule
const shadowDocumentName = "stinovani";

//current folder in which we work
let currentWorkingFolder = null;
let documentDimensions;

function setDocumentDimensions(jsonDimensions) {
    documentDimensions = JSON.parse(jsonDimensions);
    console.log("width: " + documentDimensions.widthPx, "height: " + documentDimensions.heightPx);
}

'use strict';
jsx.file('./host/stinovac_decoupled.jsx');
//theme manager to switch between dark mode and light mode
themeManager.init();

//node.js imports
const fs = require('fs');

//cs interface used for communication with photoshop
const csInterface = new CSInterface();
const path = csInterface.getSystemPath(SystemPath.EXTENSION);
console.log("the path is " + path);

//Turn persistence on
//let event = new CSEvent("com.adobe.PhotoshopPersistent", "APPLICATION");
let event = new CSEvent("com.adobe.PhotoshopUnPersistent", "APPLICATION");
const gExtensionId = "com.metlickaj.shadower";
event.extensionId = gExtensionId;
csInterface.dispatchEvent(event);

//initialize horizontally scrolling thumbnail list
const $frame  = $('#frame');
const $wrap   = $frame.parent();
const $slides = $('#slides');
const sly = new Sly('#frame', {
        horizontal: 1,
        itemNav: 'basic',
        smart: 0,
        activateMiddle: 0,
        activateOn: 'click',
        mouseDragging: 1,
        touchDragging: 1,
        releaseSwing: 0,
        scrollBy: 1,
        scrollBar: $wrap.find('.scrollbar'),
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
sly.on('active', properlyMarkPrevious);

function getShadowerStatus() {
    let status = localStorage.getItem("enabled") == "true";
    $("#shadowerEnabledSwitch").prop("checked", status);
    console.log("shadower enabled in localstorage: " + status);
    return status;
}

function setShadowerStatus(isEnabled) {
    localStorage.setItem("enabled", isEnabled == true ? "true": "");
    console.log("shadower enabled set to: " + isEnabled);
    if(getShadowerStatus()) {
        jsx.evalScript("app.documents.length", isOpenFile);
    } else {
        currentWorkingFolder = null;
        emptySlides();
        $sheetButton.attr("disabled", true);
    }
}

// Po otevření photoshopu - zkontroluje se, jestli je shadower auto-intercept zapnutý.
//Pokud ano, tak:
if(getShadowerStatus()) {
    // Pokud je otevřený obrázek, nebo po otevření libovolného obrázku:
    jsx.evalScript("app.documents.length", isOpenFile);
}

function isOpenFile(numberOfOpenFiles) {
    //pokud je otevřený obrázek
    console.log(numberOfOpenFiles);
    if(numberOfOpenFiles > 0) {
        //tak zkontroluj jestli je to platna faze
        jsx.evalScript("app.documents[app.documents.length - 1].path + '/' + app.documents[app.documents.length - 1].name", isValidFileName);
    }
}

// Má obrázek v názvu slovo "FAZE"? Pokud ano, tak
function isValidFileName(filePath) {
    //pokud je otevreny temp soubor shadoweru
    if(filePath == shadowDocumentName) {
        //tak asi uz delam shadowing a neni treba delat nove nahledy
        console.log("is the temp file for shadower");
        return;
    }
    filePath = decodeURI(filePath);
    console.log(filePath);
    if(filePath.toString().toUpperCase().indexOf("_FAZE_") != -1) {
        let fileName = getFileNameFromESPath(filePath);
        let folderPath = getWinPathFromESPath(filePath);
        jsx.evalScript("getDocumentDimensionsPx()", setDocumentDimensions);
        if(folderPath == currentWorkingFolder) {
            //pokud je folderpath identická s currentWorkingFolder, tak uz mame thumbnails a nic nedelame.
            return;
        }
        //ulož folderPath do pomocné globální proměnné - bude se používat pro kontrolu dalších otevíraných souborů.
        currentWorkingFolder = folderPath;
        //Načíst soubory z adresáře do stínovače.
        populateSlidesFromWinFolderPath(folderPath);
        //Zkontrolovat thumbnails
        thumbnailsFolderExists(filePath);
    }
}
//zkontroluj, jestli v adresáři souboru existuje adresář pro thumbnails.
function thumbnailsFolderExists(filePath) {
    let fileName = getFileNameFromESPath(filePath);
    let folderPath = getWinPathFromESPath(filePath);
    console.log("folder: " + folderPath + "; file: " + fileName);
    //pokud adresar existuje, tak
    if (fs.existsSync(folderPath + "/" + thumbnailFolderName)) {
        createThumbnails()
    } else {
        //Zeptej se, jestli chce user vytvorit nahledy
    }
}

//from '/g/FAZE/filo201_FAZE_055.psd' to 'g:/FAZE'
function getWinPathFromESPath(path) {
    return path.substring(1, path.lastIndexOf("/")).replace("/", ":/");
}

//from '/g/FAZE/filo201_FAZE_055.psd' to 'filo201_FAZE_055.psd'
function getFileNameFromESPath(path) {
    return path.substring(path.lastIndexOf("/") + 1, path.length);
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

// po otevření libovolného obrázku se zkontroluje následující:

// Je ve stejném adresáři jako obrázek adresář ".shadow?
// Pokud ano, tak se pokusím pro všechny soubory v adresáři načíst .jpg soubor.
// Pokud .jpg soubor existuje, tak porovnám date modified s date modified psd dokumentu.
// Pokud je .jpg starší než .psd, tak vytvořím nový .jpg dokument.
// Pokud .jpg soubor neexistuje, tak ho vytvořím.

// Pokud je auto-intercept vypnutý, nic se neděje.
// Nastavení autointerceptu (po jeho přepnutí) se ukládá do local cache.

//Program entrypoint aktivovaný po "otevření" či "překliknutí" na dokument
csInterface.addEventListener("documentAfterActivate", getActiveDocument);

function getActiveDocument() {
    //pokud je stinovac zapnuty
    if(!getShadowerStatus()) {
        return;
    }
    console.log("intercepted activation of a new document");
    //pokud je zrovna aktivovaný obrázek .psd
    jsx.evalScript("getPathOfActiveDocument()", isValidFileName);
}

csInterface.addEventListener("documentAfterSave", getSavedDocument);

function getSavedDocument(event) {
    //Tady se bude muset obnovovat thumbnail pro ten jeden soubor, co se zrovna uložil.
}

//current folder button
const $sheetButton = $('#working-folder');

//vyčistí slides a reloadne je, aby se aktualizoval scrollbar
function emptySlides() {
    $slides.empty();
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
                        <button id="toggle-pinned" class="topcoat-button" title="Připnout statickou fázi" onclick="togglePinned(this)"><i class="fas fa-thumbtack"></i></button>
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
        .attr("dateModified", fileInfo.mtime.getTime())
        .appendTo($slides);
    });
    sly.reload();
    if(fileNames.length) {
        $sheetButton.attr("path", folder);
        $sheetButton.attr('data-original-title', "Otevřít v průzkumníku cestu " + folder);
        $sheetButton.attr('disabled', false);
    } else {
        $sheetButton.attr('disabled', true);
    }
}

function openFolder() {
    let pathToDir = $sheetButton.attr("path");
    pathToDir = windoizePath(pathToDir);
    window.cep.process.createProcess('C:\\Windows\\explorer.exe', pathToDir);
}

function extractPathFromEvent(event) {
    let xmlData = event.data.toString();
    let startOfPath = xmlData.lastIndexOf("<url>") + 13;
    let endOfPath = xmlData.lastIndexOf("</url>");
    return xmlData.substring(startOfPath, endOfPath);
}

function windoizePath(forwardSlashPath) {
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

function createThumbnails() {
    let numOfPictures = $slides.find("li").length;
    //for each image create a new thumbnail.
    $slides.find("li").each(function(index, element) {
        let $this = $(element);
        let folder = $this.attr("folder");
        let fileName = $this.attr("fileName");
        let dateModified = $this.attr("dateModified");
        let filePath = folder + "/" + thumbnailFolderName + "/" + stripExtension(fileName) + ".jpg";
        let obj = {
            folder: folder,
            fileName: fileName,
            width: 250,
            targetSubfolder: thumbnailFolderName
        };
        //Pokud už thumbnail existuje a je novější než psd
        if(fs.existsSync(filePath) && fs.statSync(filePath).mtime.getTime() > dateModified ) {
            $this.find("img").attr("src", "file://" + filePath);
        } else {
            //vytvoř thumbnail, nebo ho zaktualizuj
            console.log(filePath + " je moc stary");
            jsx.evalScript('getJpgThumbnail(' + JSON.stringify(obj) + ')', (returnObj) => {
                let newFilePath = JSON.parse(returnObj).thumbnailPath;
                $this.find("img").attr("src", "file://" + newFilePath);
                if(numOfPictures - 1 == index) {
                    console.log(currentWorkingFolder);
                    console.log("trying to store updated html");
                }
            });
        }
    });
}

///// - kod pro samotne stinovani -

function openSlideForShadowing() {
    let $currentSlide = $slides.find(".active");
    let $previousSlide = $currentSlide.prevAll('li').not(".pinned").first();
    let $pinnedSlide = $slides.find('.pinned:not(".active")');
    let currentFilePath = getPSDFilePathFromSlide($currentSlide);
    let previousFilePath = getPSDFilePathFromSlide($previousSlide);
    let pinnedFilePath = getPSDFilePathFromSlide($pinnedSlide);
    let obj = {
        'shadowDocumentName': shadowDocumentName,
        'currentFilePath': currentFilePath,
        'previousFilePath': previousFilePath,
        'pinnedFilePath': pinnedFilePath,
        'dimensionsInPx': documentDimensions
    }
    console.log("current: " + currentFilePath);
    console.log("previous: " + previousFilePath);
    console.log("pinned: " + pinnedFilePath);

    jsx.evalScript(`shadowFromCurrentPreviousAndPinned(${JSON.stringify(obj)})`);
}

//returns path to slide.
function getPSDFilePathFromSlide($slide) {
    if($slide.length) {
        return $slide.attr("folder").toString() + "/" + $slide.attr("fileName").toString();
    }
    return undefined;
}

//////

//sets the pinned image
function togglePinned(button) {
    let $pinButton = $(button);
    $toggledSlide = $pinButton.closest("li");
    if($toggledSlide.hasClass("pinned")) {
        $toggledSlide.removeClass("pinned")
    } else {
        $slides.find(".pinned").removeClass("pinned");
        $toggledSlide.addClass("pinned")
    }
    //put "previous" to proper place!
    properlyMarkPrevious();
}

function properlyMarkPrevious() {
    $slides.find(".previous").removeClass("previous");
    $slides.find(".active").prevAll('li').not(".pinned").first().addClass("previous");
}

function tryPopulateSlides(event) {
    let filePath = extractPathFromEvent(event);
    currentWorkingFolder = filePath.substring(0, filePath.lastIndexOf("/"));
    // Try to fill the slides if empty.
    if($slides.children().length != 0) {
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