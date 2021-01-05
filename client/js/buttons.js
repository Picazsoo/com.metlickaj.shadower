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


$("#openShadower").on("click" , () => jsx.evalScript("loadFiles('explorer')", addFiles));

$("#previous-phase").on("click", () => jsx.file("./host/cibule-posun_vzad.jsx"));
$("#next-phase").on("click", () => jsx.file("./host/cibule-posun_vpred.jsx"));

$("#clear-cache").on("click", () => clearCache());

$("#create-thumbnails").on("click", () => createThumbnails());

$("#toggle-pinned").on("click", () => togglePinned());

$("#restore-thumbnails").on("click", () => {});

//rescale scrollbar
$(window).on("resize", () => sly.reload());

//$slides.on("dblclick",() => jsx.evalScript(`openFile("${getPSDFilePathFromSlide()}")`));
//$slides.on("dblclick",(event) => jsx.evalScript(`openFile("${getPSDFilePathFromEvent(event)}")`));
$slides.on("dblclick",(event) => openSlideForShadowing(event));


function getPSDFilePathFromEvent(event) {
    $activeSlide = $(event.target).closest("li");
    console.log($activeSlide);
    return $activeSlide.attr("folder") + "/" + $activeSlide.attr("fileName");
}