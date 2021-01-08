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

    openFile(psdFilePath);
    createFolderIfNotExist(psdFolder + "/" + subFolder);
    app.activeDocument.resizeImage(250);
    var exportOptions = new ExportOptionsSaveForWeb();
    exportOptions.format = SaveDocumentType.JPEG;

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

function getDocumentDimensionsPx(documentIndex) {
    var document;
    if(documentIndex == undefined) {
        document = app.activeDocument;
    } else {
        document = app.documents[documentIndex]
    }
    return JSON.lave({
        widthPx: document.width.as("px"),
        heightPx: document.height.as("px")
    })
}

function shadowFromCurrentPreviousAndPinned(obj) {

    var widthPx = obj.dimensionsInPx.widthPx;
    var heightPx = obj.dimensionsInPx.heightPx;
    var shadowDocumentName = obj.shadowDocumentName;
    //definitely obtain the shadow document (either find it or create it and find it)
    var shadowDocument = getDocumentAtAllCosts(obj.shadowDocumentName, obj.dimensionsInPx);
    app.activeDocument = shadowDocument;
    //pokud mame pinned vrstvu, tak ji pripnout.
    if(obj.pinnedFilePath) {
        var pinLayerName = "pin-" + obj.pinnedFilePath;
        //pokud najdu pinned vrstvu se stejnym jmenem, tak nebudu nic delat
        if(layerExists(pinLayerName)) {
            //do nothing for the pin layer
        } else {
            //pokud existuje "nejaka" pinned layer, tak ji chci vybrat a nahradit novou pinned vrstvou
            if(selectLayerStartingWith("pin-")) {
                replaceSmartObjContents(obj.pinnedFilePath);
            } else {
                SelectAllPixels();
                PlacePSD(obj.pinnedFilePath);
                OpacityToPercent(40);
            }
            setSmartObjLayerComp("pavel-stinovani");
            RenameLayer("pin-" + obj.pinnedFilePath);
        }
    } else {
        if(selectLayerStartingWith("pin-")) {
            DeleteLayer()
        }
        //pokud existuje "nejaka" pinned layer, tak ji chci odstranit 
    }
    if(obj.previousFilePath) {
        var prevLayerName = "prev-" + obj.previousFilePath;
        if(layerExists(prevLayerName)) {
            //do nothing
        } else {
            if(selectLayerStartingWith("prev-")) {
                replaceSmartObjContents(obj.previousFilePath);
            } else {
                SelectAllPixels();
                PlacePSD(obj.previousFilePath);
                OpacityToPercent(60);
            }
            setSmartObjLayerComp("pavel-stinovani")
            RenameLayer("prev-" + obj.previousFilePath);

        }
    } else {
        if(selectLayerStartingWith("prev-")) {
            DeleteLayer()
        }
    }
    //this should always evaluate true
    if(obj.currentFilePath) {
        var curLayerName = "top-" + obj.currentFilePath;
        if(layerExists(curLayerName)) {
            //do nothing
        } else {
            if(selectLayerStartingWith("top-")) {
                replaceSmartObjContents(obj.currentFilePath);
            } else {
                SelectAllPixels();
                PlacePSD(obj.currentFilePath);
                OpacityToPercent(80);
            }
            setSmartObjLayerComp("stinovana-faze");
            RenameLayer("top-" + obj.currentFilePath);
        }
    } else {
        if(selectLayerStartingWith("top-")) {
            DeleteLayer();
        }
    }
    //
    tady musim z vrchniho 

    //smaze historii, aby Pavel a Franta nemohli couvat do akce skriptu.
    purgeAllHistory();
}

function layerExists(layerName) {
    try {
        app.activeDocument.layers.getByName(layerName);
    } catch (err) {
        return false;
    }
    return true;
}

function getDocumentAtAllCosts(documentName, dimensionsInPx) {
    var widthPx = dimensionsInPx.widthPx;
    var heightPx = dimensionsInPx.heightPx;
    var document;
    try {
        document = app.documents.getByName(documentName);
    } catch(err) {
        CreateNewDocument(documentName, widthPx, heightPx, 300);
        document = app.documents.getByName(documentName);
    }
    return document;
}

function getLayerComps() {
    var layerComp = app.activeDocument.layerComps.getByName("vojta-vylevani");
    return layerComp;
}

function getPathOfActiveDocument() {
    var pathOfActiveDocument;
    try {
        pathOfActiveDocument = app.activeDocument.path + '/' + app.activeDocument.name;
    } catch(err) {
        pathOfActiveDocument = app.activeDocument.name;
    }
    return pathOfActiveDocument;
}