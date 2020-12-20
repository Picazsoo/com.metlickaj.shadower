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

bt_LoadShadowFiles.onClick = function() {
    Soubory_Sh = filterpsd(openDialog());
    ClearList(list_ShadowFiles);
    if (Soubory_Sh.length > 0) {
        currentFolder = Soubory_Sh[0].path + "/";
        bt_savePrefs.enabled = true
    } else {
        currentFolder = folderNotSet;
        bt_savePrefs.enabled = false
    };
    Soubory_Sh = Depath(Soubory_Sh);
    FillList(Soubory_Sh, list_ShadowFiles);
    statictext_CurrentFolder.text = currentFolder;
}

loadShadowFilesFromBridge = function() {
    Soubory_Sh = filterpsd(GetFilesFromBridge());
    ClearList(list_ShadowFiles);
    if (Soubory_Sh.length > 0) {
        currentFolder = Soubory_Sh[0].path + "/";
    } else {
        currentFolder = folderNotSet;
    };
    Soubory_Sh = Depath(Soubory_Sh);
    FillList(Soubory_Sh, list_ShadowFiles);
    statictext_CurrentFolder.text = currentFolder;
}

function loadStaticFilesFromExplorer() {
    Soubory_HP = filterpsd(openDialog());
    Soubory_HP = Depath(Soubory_HP);
    return JSON.lave(Soubory_HP);
}

loadStaticFilesFromBridge = function() {
    Soubory_HP = filterpsd(GetFilesFromBridge());
    ClearList(list_StaticFiles);
    Soubory_HP = Depath(Soubory_HP);
    FillList(Soubory_HP, list_StaticFiles);
}

bt_zapsatDoPSDs.onClick = function() {
    if (CheckIfAnyPalleteIsVisible() == true) {
        app.togglePalettes();
    };
    var length = Soubory_Sh.length;
    for (i = 0; i < length; i++) {
        var docRef = open(File(currentFolder.toString() + Soubory_Sh[i].toString()));
        var docRefPath = app.activeDocument.fullName;
        docRef.info.caption = "";
        docRef.info.copyrightNotice = "";
        var tempShadow;
        if (i == 0) {
            firstFile = app.activeDocument.fullName;
            alert(firstFile);
            tempShadow = "start"
        } else {
            tempShadow = Soubory_Sh[i - 1]
        }
        tempShadow = tempShadow + "\r";
        tempShadow = tempShadow + Soubory_Sh[i];
        tempShadow = tempShadow + "\r";
        if (i == (length-1)) {
            tempShadow = tempShadow + "end"
        } else {
            tempShadow =tempShadow + Soubory_Sh[i + 1]
        }
        docRef.info.caption = tempShadow;
 
        for (q = 0; q < Soubory_HP.length; q++) {
            var tempHelper = docRef.info.copyrightNotice;
            var tempHelper = tempHelper + Soubory_HP[q];
            var tempHelper = tempHelper + "\r";
            docRef.info.copyrightNotice = tempHelper;
        }
        docRef.close(SaveOptions.SAVECHANGES);
    }
    app.togglePalettes();
}