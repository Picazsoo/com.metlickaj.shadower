//@include "./jachym-library.jsx"
//@include "./json.jsx"

function loadFiles(source) {
    var files = [];
    if (source === 'bridge') {
        files = GetFilesFromBridge();
    } else {
        files = openDialog();
    }
    var filesWithPaths = [];
    for (var i = 0; i < files.length; i++) {
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
    return JSON.lave({
        thumbnailPath: jpgFilePath + ".jpg"
    });
}

function openFile(path) {
    open(File(path));
}

function createFolderIfNotExist(path) {
    var f = new Folder(path);
    if (!f.exists) {
        f.create()
    }
}

function openDocument(location) {
    var fileRef = new File(location);
    return app.open(fileRef);
}

function getDocumentDimensionsPx(documentIndex) {
    //alert(documentIndex);
    var document;
    if (documentIndex == undefined) {
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

    //This tells us whether the shadowing temp file has already been used for shadowing.
    //If so, we must make sure to save changes done to the eSTIN layer.
    var alreadyInited = true;
    var widthPx = obj.dimensionsInPx.widthPx;
    var heightPx = obj.dimensionsInPx.heightPx;
    var shadowDocumentName = obj.shadowDocumentName;
    //definitely obtain the shadow document (either find it or create it and find it)
    var shadowDocument = getDocumentAtAllCosts(obj);
    app.activeDocument = shadowDocument;
    //pokud mame pinned vrstvu, tak ji pripnout.
    //alert(JSON.lave(obj));

    //Pokud je alreadyInited = true, tak musime ulozit stin do faze.
    if(alreadyInited) {
        saveShadowToFile(obj);
    }

    //
    updateLayer(obj.pinnedFile);
    updateLayer(obj.previousFile);
    updateLayer(obj.currentFile);

    //otevri horni vrstvu jako soubor a zkopiruj z ni stin
    //getShadowFromFile(obj);
    var topDocument = app.open(File(obj.currentFile.path));
    SelectLayer("eSTIN");
    var topDocShadowLayer = topDocument.layers.getByName("eSTIN");
    //store layer status so we can hide it again later after selection
    var isStinVisible = topDocShadowLayer.visible;
    if(isStinVisible == false) {
        showLayer("eSTIN");
    }
    selectPixels();
    var isSelection;
    try {
        isSelection = topDocument.selection.bounds[0];
    } catch (err) {
        isSelection = null;
    }
    purgeClipboard();
    if (isSelection) {
        CopySelection();
    }
    //hide layer again.
    if(isStinVisible == false) {
        hideLayer("eSTIN");
    }
    app.activeDocument = shadowDocument;
    SelectLayer("eSTIN");
    SelectAllPixels();
    DeletePixels();
    if (isSelection) {
        PasteInPlace();
    }
    //deselect (paste in place deselects automatically, but if we do not paste...)
    JachNoMarchingAnts();

    //smaze historii, aby Pavel a Franta nemohli couvat do akce skriptu.
    //purgeAllHistory();

    //this is a nested function - to be able to access variables of the parent function.
    function getDocumentAtAllCosts(payLoadObj) {
        var documentName = payLoadObj.shadowDocumentName;
        var widthPx = payLoadObj.dimensionsInPx.widthPx;
        var heightPx = payLoadObj.dimensionsInPx.heightPx;
        var document;
        try {
            document = app.documents.getByName(documentName);
        } catch (err) {
            //throw down flag
            alreadyInited = false;
            CreateNewDocument(documentName, widthPx, heightPx, 300);
            document = app.documents.getByName(documentName);
            var layerRef = document.artLayers.add();
            layerRef.name = payLoadObj.pinnedFile.prep + "Holder";
            layerRef.allLocked = true;
            layerRef = document.artLayers.add();
            layerRef.name = payLoadObj.previousFile.prep + "Holder";
            layerRef.allLocked = true;
            layerRef = document.artLayers.add();
            layerRef.name = payLoadObj.currentFile.prep + "Holder";
            layerRef.allLocked = true;
            layerRef = document.artLayers.add();
            layerRef.name = "shadowHolder";
            layerRef.allLocked = true;
            layerRef = document.artLayers.add();
            layerRef.name = "eSTIN";
            layerRef.opacity = 30;
            layerRef.allLocked = false;
            setColorOverlay(0, 0, 0, 100);
            createLayerComp("real-shadows-30", "standardni stiny a svetla");
            layerRef.opacity = 60;
            setColorOverlay(255, 0, 0, 100);
            createLayerComp("edit-shadows-60", "stiny a svetla pro upravy");
        }
        return document;
    }
}

function saveShadowToFile(payLoadObj) {
    SelectLayer("eSTIN");
    //save reference to the shadowing document, so we can safely switch back;
    var shadowDocument = documents.getByName(payLoadObj.shadowDocumentName);
    var eSTINLayer = shadowDocument.layers.getByName("eSTIN");
    //store layer status so we can hide it again later after selection
    var isStinVisible = eSTINLayer.visible;
    if(isStinVisible == false) {
        showLayer("eSTIN");
    }
    selectPixels();
    var isSelection;
    try {
        isSelection = shadowDocument.selection.bounds[0];
    } catch (err) {
        isSelection = null;
    }
    purgeClipboard();
    if (isSelection) {
        //alert("we have a selection");
        CopySelection();
        //alert("we have a selection");
    }
    //hide layer again.
    if(isStinVisible == false) {
        hideLayer("eSTIN");
    }
    var prepDash = payLoadObj.currentFile.prep + "-";
    var topLayerName = getNameOfLayerStartingWith(prepDash);
    var topLayerFilePath = topLayerName.substring(topLayerName.indexOf(prepDash) + prepDash.length, topLayerName.length);
    var topLayerFile = topLayerFilePath.substring(topLayerFilePath.lastIndexOf("/") + 1, topLayerFilePath.length);
    //reference to the document into which we have to paste the shadow.
    var targetFile = openDocument(topLayerFilePath);
    //mark the document as active.
    app.activeDocument = targetFile;
    SelectLayer("eSTIN");
    //check if the layer is visible and force it to be visible
    var targetESTINvisible = targetFile.layers.getByName("eSTIN").visible;

    if(targetESTINvisible == false) {
        showLayer("eSTIN");
    }
    //then clear the content of the layer so it can accept whatever is coming
    //alert("about to select all");
    SelectAllPixels();
    DeletePixels();
    //then if we have something to paste, paste it into.
    if (isSelection) {
        PasteInPlace();
        purgeClipboard();
    }
    //deselect (paste in place deselects automatically, but if we do not paste...)
    JachNoMarchingAnts();

    //then set the visibility to back as it were.constructor
    if(targetESTINvisible == false) {
        hideLayer("eSTIN");
    }
    //then set the file LayerSet to Pavel-upravy??
    applyLayerComp("pavel-upravy")
    //then save the file and close it.
    targetFile.close(SaveOptions.SAVECHANGES);
    //then restore the shadowing document;
    app.activeDocument = shadowDocument
}

function updateLayer(fileObj) {
    if (fileObj.path) {
        var prepWithDash = fileObj.prep + "-";
        var layerName = prepWithDash + fileObj.path;
        //pokud najdu vrstvu se stejnym jmenem, tak nebudu nic delat
        if (layerExists(layerName)) {
            //Just make sure the layer is visible.
            LayerVisibility(layerName, true);
            OpacityToPercent(fileObj.opacity);
        } else {
            //pokud existuje "nejaka" layer, tak ji chci vybrat a nahradit novou vrstvou
            if (selectLayerStartingWith(prepWithDash)) {
                DeleteLayer();
            }
            SelectLayer(fileObj.prep + "Holder");
            SelectAllPixels();
            PlacePSD(fileObj.path);
            RenameLayer(layerName);
            OpacityToPercent(fileObj.opacity);
            ShowLayer(true);
            if (fileObj.prep == "top") {
                setSmartObjLayerCompByName("stinovana-faze");
            } else {
                setSmartObjLayerCompByName("pavel-stinovani");
            }
        }
    } else {
        //pokud existuje "nejaka" layer, tak ji chci odstranit 
        if (selectLayerStartingWith(prepWithDash)) {
            DeleteLayer()
        }
    }
}

function layerExists(layerName) {
    try {
        app.activeDocument.layers.getByName(layerName);
    } catch (err) {
        return false;
    }
    return true;
}

function getLayerComps() {
    var layerComp = app.activeDocument.layerComps.getByName("vojta-vylevani");
    return layerComp;
}

function getPathOfActiveDocument() {
    var pathOfActiveDocument;
    try {
        pathOfActiveDocument = app.activeDocument.path + '/' + app.activeDocument.name;
    } catch (err) {
        pathOfActiveDocument = app.activeDocument.name;
    }
    return pathOfActiveDocument;
}

function toggleEstin() {

}