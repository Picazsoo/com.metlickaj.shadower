/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global $, window, location, CSInterface, SystemPath, themeManager*/

(function () {

    'use strict';
    jsx.file('./host/stinovac_decoupled.jsx');

    var csInterface = new CSInterface();
    var gExtensionId = "com.metlickaj.shadower";

    function Persistent(inOn) {

        if (inOn){
            var event = new CSEvent("com.adobe.PhotoshopPersistent", "APPLICATION");
        } else {
            var event = new CSEvent("com.adobe.PhotoshopUnPersistent", "APPLICATION");
        }
        event.extensionId = gExtensionId;
        csInterface.dispatchEvent(event);
    }

    csInterface.addEventListener("documentAfterActivate", tryPopulateListBox);

    function init() {
        
        themeManager.init();

        $('#persistenceSwitch').change(function() {
            Persistent( $(this).is(':checked') );
        });
    }
        
    init();

}());

function tryPopulateListBox(event) {
    let filePath = extractPathFromEvent(event);
    let directoryPath = filePath.substring(0, filePath.lastIndexOf("/"));

    //alert(path);
    //alert(directoryPath);
    //pokud je seznam prazdny, pokusit se ho naplnit ostatnimi fazemi z adresare.
    if($("#filezz").children().length == 0) {
        let files = window.cep.fs.readdir(directoryPath);
        if (files.err) {
            // Panic and handle the error
            alert("this does not work");
        } else {
            // Array of the files (without path)
            fileNames = files.data;
            let filteredFileNames = filterFileNames(fileNames);
            filteredFileNames.sort();
            filteredFileNames.forEach(fileName => {
                //value je cela cesta k souboru
                $("#filezz").append(`<option value="${directoryPath + "/" + fileName}">${fileName}</option>\n`);
            });
            $('#working-folder').html(`<a id="link-to-working-folder" href="#" onclick="openFolder('${directoryPath}');return false">${directoryPath}</a>`);
            $("#filezz").val(filePath).scrollIntoView();
        }
    } else {
        $("#filezz").val(filePath).scrollIntoView();
    }
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
    $("#filezz").empty();
    for(var i = 0; i < files.length; i++) {
        //alert(`<option value="${files[i]}">${files[i]}</option>`);
        $("#filezz").append(`<option value="${files[i].path}">${files[i].fileName}</option>`);
    }
}
