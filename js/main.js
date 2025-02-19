/**
 * Copyright (c) Mohammad Naghavi <mohamnag@gmail.com>
 *
 * Licenced as stated by LICENSE file under root of this code.
 *
 * * NOTICE:
 *      If your nginx config varies from the default config
 *      provided in this code, you probably need to change
 *      value of filesBaseUrl here too.
 *
 * Created by mohamnag on 11/02/16.
 */

$(document).ready(function () {

    function applyTheme() {
        var theme = $('input[name=theme]:checked').val()

        console.log(`setting theme to '${theme}'`)

        $('body')
            .removeClass()
            .addClass(theme)

        localStorage.setItem("theme", theme)
    }

    function renderFileElement(directory, fileName, fileType, fileSize, fileDate) {

        var fileItemElement = fileItemElementTemplate.clone();

        fileItemElement.addClass(fileType);
        fileItemElement.find(".file-name").text(fileName);

        if (fileDate) {
            fileItemElement.find(".file-date").text(moment(fileDate).fromNow());
        }

        if (fileType === "parent") {
            // navigate to parent dir
            fileItemElement.find(".file-link").click(function () {
                navigateTo(directory);
            });

        } else if (fileType === "directory") {
            // navigate to sub dir
            fileItemElement.find(".file-link").click(function () {
                navigateTo(directory + fileName + "/");
            });

        } else if (fileType === "other") {
            // nginx returns symlinks as type other,
            // lets try to follow the links
            fileItemElement.find(".file-link").click(function () {
                navigateTo(directory + fileName + "/");
            });

        } else {
            // just file dl
            fileItemElement.find(".file-link")
                .attr("href", filesBaseUrl + directory + fileName)
                .attr("target", "_blank");
        }

        if (fileSize) {
            fileItemElement.find(".file-size").text(fileSize);
        }

        return fileItemElement;
    }

    function getParentDir(path) {

        if (path.length <= 1) {
            return null;
        }

        var lastSlashPos = path.lastIndexOf("/", path.length - 2);
        var parentDir = lastSlashPos >= 0 ? path.substr(0, lastSlashPos + 1) : null;

        return parentDir;
    }

    function renderFileList(filesData, path) {

        var sortBy = $('input[name=sort]:checked').val();
        if (sortBy === "date") {
            console.log("sort by date");

            filesData.sort(function (fileA, fileB) {
                return fileB.mtime.getTime() - fileA.mtime.getTime();
            });

        } else if (sortBy === "name") {
            console.log("sort by name");

            filesData.sort(function (fileA, fileB) {
                return fileA.name.toLowerCase().localeCompare(fileB.name.toLowerCase());
            });

        } else if (sortBy === "size") {
            console.log("sort by size");

            filesData.sort(function (fileA, fileB) {
                var sizeA = fileA.rawSize ? fileA.rawSize : Number.MIN_VALUE;
                var sizeB = fileB.rawSize ? fileB.rawSize : Number.MIN_VALUE;
                return sizeA - sizeB;
            });
        }

        fileListElement.empty();

        var parentDir = getParentDir(path);

        if (parentDir) {
            fileListElement.append(renderFileElement(
                parentDir,
                "..",
                "parent"
            ));
        }

        filesData.forEach(function (fileData) {
            fileListElement.append(renderFileElement(
                path,
                fileData.name,
                fileData.type,
                fileData.size,
                fileData.mtime
            ));
        });
    }

    function navigateTo(path) {
        console.log("navigateTo", path);
        isNavigating = true;

        $.ajax({
            url: filesBaseUrl + path,

            dataType: "json",

            success: function (filesData) {

                // fix sizes and dates
                filesData.map(function (fileData) {
                    fileData.mtime = new Date(fileData.mtime);

                    if (fileData.hasOwnProperty("size")) {
                        fileData.rawSize = fileData.size;
                        fileData.size = fileSize(fileData.size);
                    }

                    return fileData;
                });

                renderFileList(filesData, path);

                $('input[name=sort]')
                    .unbind("change")
                    .on("change", function () {
                        renderFileList(filesData, path);
                    });

                console.log("replaceState", path);
                history.replaceState(null, path, '#' + path);


                isNavigating = false;
            },

            error: function (jqxhr, textStatus, errorThrown) {
                console.log(jqxhr, textStatus, errorThrown);

                if(textStatus === "timeout") {
                    alert("Request to server timed out, retry later!");

                } else if(textStatus === "abort") {
                    alert("Connection to server has been aborted, retry later!");

                } else if(textStatus === "parsererror") {
                    alert("Invalid response from server!");

                } else if(jqxhr.status === 404) {
                    alert("Server cant find this file/directory!");

                } else {
                    // also if(textStatus === "error")
                    alert("Something went wrong in communication to server, retry later!");
                }

                history.back();
            }
        });
    }

    function fileSize(bytes) {
        var exp = Math.log(bytes) / Math.log(1024) | 0;
        var value = bytes / Math.pow(1024, exp);

        if (exp == 0) {
            return value.toFixed(0) + ' bytes';

        } else {
            var result = value.toFixed(2);
            return result + ' ' + 'KMGTPEZY'[exp - 1] + 'B';
        }

    }

    function navigateToUrlLocation() {
        var requestedPath = window.location.hash;
        var startPath = requestedPath ? requestedPath.substr(1) : "/";
        navigateTo(startPath);
    }

    var filesBaseUrl = "/files";
    var isNavigating = false;
    var fileListElement = $("#file-list");
    var fileItemElementTemplate = fileListElement.find("li").detach();

    // setup theme switching
    $('input[name=theme]').on("change", applyTheme);

    // apply current theme
    var theme = localStorage.getItem("theme")
    console.log(`theme '${theme}' loaded`)
    $(`input[name=theme][value='${theme}']`).prop('checked', true)
    applyTheme()

    window.onpopstate = function () {
        if (!isNavigating) {
            navigateToUrlLocation();
        }
    };

    navigateToUrlLocation();

    // add context menu to file and directory items
    $(document).on("contextmenu", ".file-link", function (event) {
        // prevent default context menu
        event.preventDefault();
    
        // remove any existing context menus
        $(".context-menu").remove();
    
        // create context menu
        var menu = $("<div>").addClass("context-menu");
        var copyItem = $("<div>").addClass("menu-item").text("Copy");
        var deleteItem = $("<div>").addClass("menu-item").text("Delete");
        var renameItem = $("<div>").addClass("menu-item").text("Rename");
        menu.append(copyItem).append(deleteItem).append(renameItem);
    
        // position menu
        menu.css({
        top: event.pageY + "px",
        left: event.pageX + "px",
        position: "absolute",
        });
    
        // append menu to body
        $("body").append(menu);
    
        // remove menu on click
        menu.on("click", function (event) {
        event.stopPropagation();
        menu.remove();
        });
    
        // remove menu on click outside
        $(document).on("click.contextmenu", function () {
        menu.remove();
        $(document).off("click.contextmenu");
        });
    });  

});