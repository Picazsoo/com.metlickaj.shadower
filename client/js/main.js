/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global $, window, location, CSInterface, SystemPath, themeManager*/

'use strict';
jsx.file('./host/stinovac_decoupled.jsx');
//theme manager to switch between dark mode and light mode
themeManager.init();

//node.js imports
const fs = require('fs');

const csInterface = new CSInterface();
const path = csInterface.getSystemPath(SystemPath.EXTENSION);
console.log("the path is " + path);
var gExtensionId = "com.metlickaj.shadower";

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
csInterface.addEventListener("documentAfterActivate", tryPopulateListBox);

$('#persistenceSwitch').on('change', function() {
    Persistent( $(this).is(':checked') );
});

function Persistent(inOn) {

    if (inOn){
        var event = new CSEvent("com.adobe.PhotoshopPersistent", "APPLICATION");
    } else {
        var event = new CSEvent("com.adobe.PhotoshopUnPersistent", "APPLICATION");
    }
    event.extensionId = gExtensionId;
    csInterface.dispatchEvent(event);
}

const $sheetFolder = $('#working-folder');

(function() {
    let persistedSheets = localStorage.getItem('persistedSheets');
    let workingFolder = localStorage.getItem('workingFolder');
    if(persistedSheets && workingFolder) {
        populateSheetBox(JSON.parse(persistedSheets), JSON.parse(workingFolder));
    } else {
        //
    }
})();

function tryPopulateListBox(event) {
    let filePath = extractPathFromEvent(event);
    let directoryPath = filePath.substring(0, filePath.lastIndexOf("/"));
    // Try to fill the sheets list if empty.
    if($slides.children().length != 0) {
        return;
    }
    let files = window.cep.fs.readdir(directoryPath);
    if (files.err) {
        // do nothing.
    } else {
        // Array of the files (without path)
        let fileNames = files.data;
        let filteredFileNames = filterFileNames(fileNames);
        filteredFileNames.sort();
        localStorage.setItem('persistedSheets', JSON.stringify(filteredFileNames));
        localStorage.setItem('workingFolder', JSON.stringify(directoryPath));
        populateSheetBox(filteredFileNames, directoryPath);
    }
}

function populateSheetBox(fileNames, folder) {
    //empty both
    $slides.html("");
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
                id: withoutExtension(fileName),
                title: fileName,
            })
            .data("folder", folder)
            .data("fileName", fileName)
            .appendTo($slides);
    });
    sly.reload();
    $sheetFolder.html(`<a id="link-to-working-folder" href="#" onclick="openFolder('${folder}');return false">${folder}</a>`);
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

function withoutExtension(fileName) {
    return fileName.substring(0, fileName.toUpperCase().lastIndexOf(".PSD"));
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

function importImage() {
    $slides.find("li").each(function() {
        let $this = $(this);
        let obj = {
            folder: $this.data("folder"),
            fileName: $this.data("fileName"),
            width: 250,
            targetSubfolder: ".shadow"
        };
        console.log(obj);
        jsx.evalScript('getPngThumbnail(' + JSON.stringify(obj) + ')', (returnObj) => {
            let pngPath = JSON.parse(returnObj).thumbnailPath;
            $this.find("img").attr("src", "file://" + pngPath);
        });
    })
}