/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global $, window, location, CSInterface, SystemPath, themeManager*/

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

//current folder in which we work
let currentWorkingFolder;

//initialize horizontally scrolling thumbnail list
const $frame  = $('#frame');
const $wrap   = $frame.parent();
const $slides = $('#slides');
const sly = new Sly('#frame', {
        horizontal: 1,
        itemNav: 'basic',
        smart: 1,
        activateMiddle: 0,
        activateOn: 'click',
        mouseDragging: 1,
        touchDragging: 1,
        releaseSwing: 1,
        scrollBy: 1,
        scrollBar: $wrap.find('.scrollbar'),
        speed: 300,
        elasticBounds: 0,
        easing: 'swing',
        dragHandle: 1,
        dynamicHandle: 1,
        clickBar: 1,
        startAt: 0
});
sly.init();

//Check if previous shadowing session exists.
csInterface.addEventListener("documentAfterActivate", tryPopulateSlides);

$('#persistenceSwitch').on('change', function() {
    Persistent( $(this).is(':checked') );
});

function Persistent(inOn) {
    if (inOn){
        let event = new CSEvent("com.adobe.PhotoshopPersistent", "APPLICATION");
    } else {
        let event = new CSEvent("com.adobe.PhotoshopUnPersistent", "APPLICATION");
    }
    const gExtensionId = "com.metlickaj.shadower";
    event.extensionId = gExtensionId;
    csInterface.dispatchEvent(event);
}

//clickable folder link
const $sheetFolder = $('#working-folder');

//This always runs after reload.
// (function() {
//     let persistedSheets = localStorage.getItem('persistedSheets');
//     let workingFolder = localStorage.getItem('workingFolder');
//     if(persistedSheets && workingFolder) {
//         populateSlides(JSON.parse(persistedSheets), JSON.parse(workingFolder));
//     } else {
//         //
//     }
// })();

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

function storeWorkingEnvironment(pathToFolder) {
    let storedEnvironmentsMap;
    //if nothing is stored, create new map. Otherwise parse stored values.
    if(localStorage.getItem('persistedSheets')) {
        storedEnvironmentsMap = new Map(JSON.parse(localStorage.getItem('persistedSheets')));
    } else {
        storedEnvironmentsMap = new Map();
    }
    storedEnvironmentsMap.set(pathToFolder, $slides.get(0).innerHTML);
    console.log($slides.get(0).innerHTML);
    localStorage.setItem('persistedSheets', JSON.stringify(Array.from(storedEnvironmentsMap)));
}

function retrieveWorkingEnvironment(pathToFolder) {
    console.log(pathToFolder);
    let storedEnvironmentsMap;
    if(localStorage.getItem('persistedSheets')) {
        storedEnvironmentsMap = new Map(JSON.parse(localStorage.getItem('persistedSheets')));
    } else {
        storedEnvironmentsMap = new Map();
    }
    console.log("trying to retrieve");
    return storedEnvironmentsMap.get(pathToFolder);
}

function populateSlides(fileNames, folder) {
    //empty slides
    $slides.empty();
    let stored = retrieveWorkingEnvironment(folder);
    if(stored) {
        $slides.append(stored);
        console.log("retrieved!!!");
    } else {
        fileNames.forEach(fileName => {
            //Populate thumbnails.
            $(
                `<li>
                    <div class="slideframe">
                        <div class="imageholder">
                            <img>
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
            .appendTo($slides);
        });
    }
    sly.reload();
    $sheetFolder.html(`<a id="link-to-working-folder" href="#" onclick="openFolder('${folder}');return false">${folder}</a>`);
    storeWorkingEnvironment(folder);
}

function openFolder(dir) {
    let pathToDir = windoizePath(dir);
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
    let filteredFileNames = [];
    fileNames.forEach(element => {
        if(element.toUpperCase().lastIndexOf(".PSD") != -1) {
            filteredFileNames.push(element);
        }
    });
    return filteredFileNames;
}

function clearCache() {
    localStorage.removeItem('persistedSheets');
    localStorage.removeItem('workingFolder');
}

function createThumbnails() {
    jsx.evalScript('hidePalettes()');
    let numOfPictures = $slides.find("li").length;
    //for each image create a new thumbnail.
    $slides.find("li").each(function(index, element) {
        let $this = $(element);
        let obj = {
            folder: $this.attr("folder"),
            fileName: $this.attr("fileName"),
            width: 250,
            targetSubfolder: ".shadow"
        };
        jsx.evalScript('getJpgThumbnail(' + JSON.stringify(obj) + ')', (returnObj) => {
            let filePath = JSON.parse(returnObj).thumbnailPath;
            $this.find("img").attr("src", "file://" + filePath);
            if(numOfPictures - 1 == index) {
                console.log(currentWorkingFolder);
                console.log("trying to store updated html");
                storeWorkingEnvironment(currentWorkingFolder);
                jsx.evalScript('showPalettes()');
            }
        });
    });
}