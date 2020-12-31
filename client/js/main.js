/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global $, window, location, CSInterface, SystemPath, themeManager*/

'use strict';
jsx.file('./host/stinovac_decoupled.jsx');

var csInterface = new CSInterface();
var gExtensionId = "com.metlickaj.shadower";

csInterface.addEventListener("documentAfterActivate", tryPopulateListBox);

themeManager.init();

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

const $sheets = $("#sheets");
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
    if($sheets.children().length == 0) {
        let files = window.cep.fs.readdir(directoryPath);
        if (files.err) {
            // do nothing.
        } else {
            // Array of the files (without path)
            fileNames = files.data;
            let filteredFileNames = filterFileNames(fileNames);
            filteredFileNames.sort();
            localStorage.setItem('persistedSheets', JSON.stringify(filteredFileNames));
            localStorage.setItem('workingFolder', JSON.stringify(directoryPath));
            populateSheetBox(filteredFileNames, directoryPath);
            $sheets.val(filePath).get(0).scrollIntoView();
        }
    } else {
        $sheets.val(filePath).get(0).scrollIntoView();
    }
}

function populateSheetBox(fileNames, folder) {
    fileNames.forEach(fileName => {
        //Populate select list. Set value to be the entire path to the sheet.
        $sheets.append(`<option value="${folder + "/" + fileName}">${fileName}</option>\n`);
    });
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

function filterFileNames(fileNames) {
    let filteredFileNames = [];
    fileNames.forEach(element => {
        if(element.toUpperCase().lastIndexOf(".PSD") != -1) {
            filteredFileNames.push(element);
        }
    });
    return filteredFileNames;
}

function addFiles(red) {
    var files = JSON.parse(red);
    $sheets.empty();
    for(var i = 0; i < files.length; i++) {
        //alert(`<option value="${files[i]}">${files[i]}</option>`);
        $sheets.append(`<option value="${files[i].path}">${files[i].fileName}</option>`);
    }
}

function clearCache() {
    localStorage.removeItem('persistedSheets');
    localStorage.removeItem('workingFolder');
}

function importImage() {
    //cep_node.process.pippo = "doge";
    logToConsole();
}

function logToConsole() {
    console.log(cep_node);
}