//@include "../../common_library/photoshop_library.jsx"

var alreadyInited = true;

function loadFiles(source) {
    var files = [];
    if (source === 'bridge') {
        files = getFilesFromBridge();
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

function openFirstSelectedFile() {
    files = openDialog();
    if (files.length != 0) {
        open(files[0]);
    }
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
    alreadyInited = true;
    var widthPx = obj.dimensionsInPx.widthPx;
    var heightPx = obj.dimensionsInPx.heightPx;
    var shadowDocumentName = obj.shadowDocumentName;
    //definitely obtain the shadow document (either find it or create it and find it)
    var shadowDocument = getDocumentAtAllCosts(obj);
    app.activeDocument = shadowDocument;
    //set brush to black!!!
    resetSwatches()
    applyLayerComp("edit-shadows-60");
    //pokud mame pinned vrstvu, tak ji pripnout.
    //alert(JSON.lave(obj));

    //Pokud je alreadyInited = true, tak musime ulozit stin do faze.
    if (alreadyInited) {
        saveShadowToFile(obj);
    }

    //
    updateLayer(obj.pinnedFile);
    updateLayer(obj.previousFile);
    updateLayer(obj.currentFile);

    //otevri horni vrstvu jako soubor a zkopiruj z ni stin
    //getShadowFromFile(obj);
    var topDocument = app.open(File(obj.currentFile.path));
    selectLayers("eSTIN");
    var topDocShadowLayer = topDocument.layers.getByName("eSTIN");
    //store layer status so we can hide it again later after selection
    var isStinVisible = topDocShadowLayer.visible;
    if (isStinVisible == false) {
        showLayers("eSTIN");
    }
    setMarqueByTransparency();
    var isSelection;
    try {
        isSelection = topDocument.selection.bounds[0];
    } catch (err) {
        isSelection = null;
    }
    purgeClipboard();
    if (isSelection) {
        copySelection();
    }
    //hide layer again.
    if (isStinVisible == false) {
        hideLayers("eSTIN");
    }
    app.activeDocument = shadowDocument;
    selectLayers("eSTIN");
    selectAllPixels();
    deleteSelectedPixels();
    if (isSelection) {
        pasteInPlace();
    }
    //deselect (paste in place deselects automatically, but if we do not paste...)
    deselectMarque();

    //smaze historii, aby Pavel a Franta nemohli couvat do akce skriptu.
    purgeAllHistory();

}
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
        createNewDocument(documentName, widthPx, heightPx, 300);
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
        setColorOverlay(0, 0, 0, 100, layerRef.name);
        createLayerComp("real-shadows-30", "standardni stiny a svetla");
        layerRef.opacity = 60;
        setColorOverlay(255, 0, 0, 100, layerRef.name);
        createLayerComp("edit-shadows-60", "stiny a svetla pro upravy");
    }
    return document;
}

function saveShadowToFile(payLoadObj) {
    selectLayers("eSTIN");
    //save reference to the shadowing document, so we can safely switch back;
    var shadowDocument = documents.getByName(payLoadObj.shadowDocumentName);
    var eSTINLayer = shadowDocument.layers.getByName("eSTIN");
    //store layer status so we can hide it again later after selection
    var isStinVisible = eSTINLayer.visible;
    if (isStinVisible == false) {
        showLayers("eSTIN");
    }
    setMarqueByTransparency();
    var isSelection;
    try {
        isSelection = shadowDocument.selection.bounds[0];
    } catch (err) {
        isSelection = null;
    }
    purgeClipboard();
    if (isSelection) {
        //alert("we have a selection");
        copySelection();
        //alert("we have a selection");
    }
    //hide layer again.
    if (isStinVisible == false) {
        hideLayers("eSTIN");
    }
    var prepDash = payLoadObj.currentFile.prep + "-";
    var topLayerName = getNameOfLayerStartingWith(prepDash);
    var topLayerFilePath = topLayerName.substring(topLayerName.indexOf(prepDash) + prepDash.length, topLayerName.length);
    var topLayerFile = topLayerFilePath.substring(topLayerFilePath.lastIndexOf("/") + 1, topLayerFilePath.length);
    //reference to the document into which we have to paste the shadow.
    var targetFile = openDocument(topLayerFilePath);
    //mark the document as active.
    app.activeDocument = targetFile;
    selectLayers("eSTIN");
    //check if the layer is visible and force it to be visible
    var targetESTINvisible = targetFile.layers.getByName("eSTIN").visible;

    if (targetESTINvisible == false) {
        showLayers("eSTIN");
    }
    //then clear the content of the layer so it can accept whatever is coming
    //alert("about to select all");
    selectAllPixels();
    deleteSelectedPixels();
    //then if we have something to paste, paste it into.
    if (isSelection) {
        pasteInPlace();
        purgeClipboard();
    }
    //deselect (paste in place deselects automatically, but if we do not paste...)
    deselectMarque();

    //then set the visibility to back as it were.constructor
    if (targetESTINvisible == false) {
        hideLayers("eSTIN");
    }
    //then set the file LayerSet to Pavel-upravy??
    applyLayerComp("pavel-upravy")
    //then save the file and close it.
    targetFile.close(SaveOptions.SAVECHANGES);
    //then restore the shadowing document;
    app.activeDocument = shadowDocument
}

function updateLayer(fileObj) {
    var prepWithDash = fileObj.prep + "-";
    if (fileObj.path) {
        var layerName = prepWithDash + fileObj.path;
        //pokud najdu vrstvu se stejnym jmenem, tak nebudu nic delat
        if (layerExists(layerName)) {
            //Just make sure the layer is visible.
            showLayers(layerName);
            selectLayers(layerName);
            opacityToPercent(fileObj.opacity, layerName);
        } else {
            //pokud existuje "nejaka" layer, tak ji chci vybrat a nahradit novou vrstvou
            if (selectLayerStartingWith(prepWithDash)) {
                deleteLayer();
            }
            selectLayers(fileObj.prep + "Holder");
            selectAllPixels();
            PlacePSD(fileObj.path);
            renameLayerFromTo(null, layerName);
            opacityToPercent(fileObj.opacity, layerName);
            showLayers(layerName);
            if (fileObj.prep == "top") {
                setSmartObjLayerCompByName("stinovana-faze");
            } else {
                setSmartObjLayerCompByName("pavel-stinovani");
            }
        }
    } else {
        //alert("chci smazat: " + fileObj.path);
        //pokud existuje "nejaka" layer, tak ji chci odstranit 
        if (selectLayerStartingWith(prepWithDash)) {
            deleteLayer()
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

function toggleFinalPreview(setTo) {
    if (setTo == false) {
        //alert("chceme malovat");
        applyLayerComp("edit-shadows-60");
        showLayers(getNameOfLayerStartingWith("top-"));
        showLayers(getNameOfLayerStartingWith("prev-"));
        showLayers(getNameOfLayerStartingWith("pin-"));
        purgeAllHistory();
    } else {
        //alert("chceme koukat");
        applyLayerComp("real-shadows-30");
        showLayers(getNameOfLayerStartingWith("top-"));
        hideLayers(getNameOfLayerStartingWith("prev-"));
        hideLayers(getNameOfLayerStartingWith("pin-"));
        purgeAllHistory();
    }
}

function getPathOfActiveDocument(defaultFileName) {
    var fileName;
    try {
        fileName = app.activeDocument.fullName.fsName;
    } catch (err) {
        fileName = app.activeDocument.name;
        if (fileName.indexOf(defaultFileName) != -1) {
            fileName = defaultFileName;
        }
    }
    return fileName;
}