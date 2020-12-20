/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global $, window, location, CSInterface, SystemPath, themeManager*/

$("#restartExt").click(function() {
    try {
        ////////////////////////////////////////////////////////////////////////////////////////////////////
        // if we're restarting then we should remove all the eventListeners so we don't get double events //
        // Try get the point over                                                                         //
        // CRITICAL MAKE SURE TO CLOSE NULLIFY ETC. ANY LOOSE WATCHERS, EVENTLISTENERS, GLOBALS ETC.      //
        // CRITICAL MAKE SURE TO CLOSE NULLIFY ETC. ANY LOOSE WATCHERS, EVENTLISTENERS, GLOBALS ETC.      //
        // CRITICAL MAKE SURE TO CLOSE NULLIFY ETC. ANY LOOSE WATCHERS, EVENTLISTENERS, GLOBALS ETC.      //
        // CRITICAL MAKE SURE TO CLOSE NULLIFY ETC. ANY LOOSE WATCHERS, EVENTLISTENERS, GLOBALS ETC.      //
        // for example watcher.close();                                                                   //
        // Then reset the UI to load it's page (if it hasn't change page)                                 //
        ////////////////////////////////////////////////////////////////////////////////////////////////////
        process.removeAllListeners();
        window.location.href = "index.html";
    } catch (e) {
        window.location.href = "index.html";
    }
});

//$("#openShadower").click(function() {jsx.file('./host/stinovac_18_09_2019.jsx')});
$("#openShadower").click(function() {jsx.evalScript('loadStaticFilesFromExplorer()', addFiles)});


function addFiles(red) {
    var files = JSON.parse(red);
    for(var i = 0; i < files.length; i++) {
        alert(files[i]);
    }
    $.each(res, function() {
        $("#filezz").append($("<option />").val(this).text(this));
    })
}
