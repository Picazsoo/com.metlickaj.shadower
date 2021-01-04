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

$("#openShadower").on("click" , () => jsx.evalScript("loadFiles('explorer')", addFiles));
//$("#openShadower").on("click" , () => jsx.file("./host/stinovac_18_09_2019.jsx"));

$("#previous-phase").on("click", () => jsx.file("./host/cibule-posun_vzad.jsx"));
$("#next-phase").on("click", () => jsx.file("./host/cibule-posun_vpred.jsx"));

$("#clear-cache").on("click", () => clearCache());

$("#create-thumbnails").on("click", () => createThumbnails());

$("#restore-thumbnails").on("click", () => retrieveWorkingEnvironment());

//rescale scrollbar
$(window).on("resize", () => sly.reload());

$slides.on("dblclick",() => jsx.evalScript(`openFile("${getPSDFilePathFromSlide()}")`));

function getPSDFilePathFromSlide() {
    $activeSlide = $slides.find(".active");
    return $activeSlide.attr("folder") + "/" + $activeSlide.attr("fileName");
}
