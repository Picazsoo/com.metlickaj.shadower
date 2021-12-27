/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global $, window, location, CSInterface, SystemPath, themeManager*/

$("#restartExt").on("click", function() {
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

//Ovladač zapínání a vypínání celé aplikace.
$("#shadowerEnabledSwitch").on("click" , function() { setShadowerStatus(this.checked)});

$('#shadowerEnabledSwitch').on("change", function(){
    $('#status').html(this.checked?'callback true':'callback false');
});

$('#includePrevious').on("click", function() { setIncludePreviousPhase()});


$("#openShadower").on("click" , () => jsx.evalScript("loadFiles('explorer')", addFiles));

$("#create-thumbnails").on("click", () => createThumbnails());

// $("#working-folder").on("click", () => openFolder());
$("#open-file").on("click", () => jsx.evalScript("openFirstSelectedFile()"));

$("#shadow-preview").on("click", () => toggleFinalView());

//rescale scrollbar
$(window).on("resize", () => sly.reload());

$SLIDES.on("dblclick",(event) => openSlideForShadowing(event));
$("#open-selected").on("click",(event) => openSlideForShadowing(event));
$("#open-previous").on("click",(event) => openPreviousSlideForShadowing(event));
$("#open-next").on("click",(event) => openNextSlideForShadowing(event));


function getPSDFilePathFromEvent(event) {
    $activeSlide = $(event.target).closest("li");
    console.log($activeSlide);
    return $activeSlide.attr("folder") + "/" + $activeSlide.attr("fileName");
}

$(window).on("ready", function(){
    $("[rel='tooltip']").tooltip();
      })