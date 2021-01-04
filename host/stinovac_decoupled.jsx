//@include "./jachym-library.jsx"
//@include "./json.jsx"

var currentFolder;
var folderNotSet = "není vybraná složka";
var Soubory_Sh = [];
var Soubory_HP = [];
var folderFile;
var firstFile;

function filterpsd(inputList) {
    var inputList_nonfiltered = [];
    inputList_nonfiltered = inputList;

    var inputList_filtered = [];
    var length = inputList_nonfiltered.length;

    for (i = 0; i < length; i++) {
        if (inputList_nonfiltered[i].toString().search(".psd") > 0 || inputList_nonfiltered[i].toString().search(".PSD") > 0) {
            inputList_filtered[inputList_filtered.length] = inputList_nonfiltered[i];
        }
    }
    return inputList_filtered;
}

function Depath(inputList) {
    var inputList_nonfiltered = [];
    inputList_nonfiltered = inputList;

    var inputList_filtered = [];
    var length = inputList_nonfiltered.length;
    var tempFile;

    for (i = 0; i < length; i++) {
        tempFile = inputList_nonfiltered[i].toString();
        inputList_filtered[i] = tempFile.substring(tempFile.lastIndexOf("/", ) + 1, tempFile.length);
    }
    return inputList_filtered;
}

function loadFiles(source) {
    var files = [];
    if(source === 'bridge') {
        files = GetFilesFromBridge();
    } else {
        files = openDialog();
    }
    var filesWithPaths = [];
    for(var i = 0; i < files.length; i++) {
        var filePath = files[i].toString();
        filesWithPaths.push({
            fileName: filePath.substring(filePath.lastIndexOf("/") + 1),
            path: filePath
        });
    }   
    return JSON.lave(filesWithPaths);
}

function getJpgThumbnail(paramObj) {
    var psdFolder = paramObj.folder;
    var psdFileName = paramObj.fileName;
    var psdFilePath = psdFolder + "/" + psdFileName;
    var subFolder = paramObj.targetSubfolder;
    var jpgFilePath = psdFolder + "/" + subFolder + "/" + psdFileName.substring(0, psdFileName.toUpperCase().lastIndexOf(".PSD"));
    var width = paramObj.width;

    // alert(folder);
    // alert(fileName);
    // alert(subFolder);
    openFile(psdFilePath);
    //resizeToWidth(width);
    createFolderIfNotExist(psdFolder + "/" + subFolder);
    var exportOptions = new ExportOptionsSaveForWeb();
    exportOptions.format = SaveDocumentType.JPEG;

    app.activeDocument.resizeImage(250);
    app.activeDocument.exportDocument(new File(jpgFilePath + ".jpg"), ExportType.SAVEFORWEB, exportOptions);
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
    return JSON.lave({thumbnailPath: jpgFilePath + ".jpg"});
}

function openFile(path) {
    open(File(path));
}

function createFolderIfNotExist(path) {
    var f = new Folder(path);
    if ( ! f.exists ) {
        f.create()
    }
}

function openDocument(location){
  var fileRef = new File(location);
  var docRef = app.open(fileRef);
}

function hidePalettes() {
    if(CheckIfAnyPalleteIsVisible() == true){
    app.togglePalettes();
    }
}

function showPalettes() {
    if(CheckIfAnyPalleteIsVisible() == false){
    app.togglePalettes();
    }
}