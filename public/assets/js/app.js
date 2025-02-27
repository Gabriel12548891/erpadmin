(function($) {
    "use strict";

    // Variables globales y configuración inicial
    let sidebarSizeType = document.body.getAttribute("data-sidebar-size"); // Renombrar 'e' a algo descriptivo
    const defaultTheme = "light";
    let currentTheme = localStorage.getItem("minia-theme") || defaultTheme;
    // Añadir variable para el tamaño de la barra lateral
    const defaultSidebarSize = "lg";
    let currentSidebarSize = localStorage.getItem("minia-sidebar-size") || defaultSidebarSize;

    /**
     * Función para iniciar la animación de los contadores.
     */
    function initCounters() {
        const counterElements = document.querySelectorAll(".counter-value");
        counterElements.forEach(counter => {
            function updateCounter() {
                const targetValue = +counter.getAttribute("data-target");
                let currentValue = +counter.innerText;
                let increment = targetValue / 250; // Velocidad de incremento, ajustable

                if (increment < 1) {
                    increment = 1;
                }

                if (currentValue < targetValue) {
                    counter.innerText = (currentValue + increment).toFixed(0);
                    setTimeout(updateCounter, 1); // Llama recursivamente hasta alcanzar el valor objetivo
                } else {
                    counter.innerText = targetValue;
                }
            }
            updateCounter(); // Iniciar la animación para cada contador
        });
    }

    /**
     * Función para cerrar los menús desplegables de la barra de navegación superior.
     */
    function collapseTopnavMenus() {
        const topnavLinks = document.getElementById("topnav-menu-content").getElementsByTagName("a");
        for (let i = 0; i < topnavLinks.length; i++) {
            const link = topnavLinks[i];
            if (link && link.parentElement && link.parentElement.classList.contains("nav-item") && link.parentElement.classList.contains("dropdown") && link.parentElement.classList.contains("active")) {
                link.parentElement.classList.remove("active");
                if (link.nextElementSibling) {
                    link.nextElementSibling.classList.remove("show");
                }
            }
        }
    }

    /**
     * Función para marcar un checkbox como seleccionado.
     * @param {string} checkboxId - ID del checkbox.
     */
    function setCheckboxChecked(checkboxId) {
        document.getElementById(checkboxId).checked = true;
    }

    /**
     * Función para manejar el cambio de estado de pantalla completa.
     */
    function handleFullscreenChange() {
        if (!document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
            $("body").removeClass("fullscreen-enable");
        }
    }


    /* Inicializaciones y Eventos */

    // Inicializar el menú lateral con MetisMenu
    $("#side-menu").metisMenu();

    // Iniciar la animación de los contadores
    initCounters();

    // Evento load de la ventana
    $(window).on("load", function() {
        // Evento para los switches (si es que existen y toggleWeather está definido)
        $(".switch").on("switch-change", function() {
            if (typeof toggleWeather === 'function') { // Verificar si toggleWeather está definido globalmente
                toggleWeather();
            }
        });

        // Ajustar el tamaño de la barra lateral si el ancho de la ventana está entre 1024 y 1366 px
        if (window.innerWidth >= 1024 && window.innerWidth <= 1366) {
            document.body.setAttribute("data-sidebar-size", "sm");
            setCheckboxChecked("sidebar-size-small");
        }
    });

    // Evento click del botón del menú vertical (sidebar)
    $("#vertical-menu-btn").on("click", function(event) {
        event.preventDefault();
        $("body").toggleClass("sidebar-enable");

        if ($(window).width() >= 992) {
            const currentSidebarSize = document.body.getAttribute("data-sidebar-size");
            if (sidebarSizeType === null) { // Usar la variable renombrada
                if (currentSidebarSize === null || currentSidebarSize === "lg") {
                    document.body.setAttribute("data-sidebar-size", "sm");
                    localStorage.setItem("minia-sidebar-size", "sm");
                } else {
                    document.body.setAttribute("data-sidebar-size", "lg");
                    localStorage.setItem("minia-sidebar-size", "lg");
                }
            } else if (sidebarSizeType === "md") {
                if (currentSidebarSize === "md") {
                    document.body.setAttribute("data-sidebar-size", "sm");
                    localStorage.setItem("minia-sidebar-size", "sm");
                } else {
                    document.body.setAttribute("data-sidebar-size", "md");
                    localStorage.setItem("minia-sidebar-size", "md");
                }
            } else if (currentSidebarSize === "sm") {
                document.body.setAttribute("data-sidebar-size", "lg");
                localStorage.setItem("minia-sidebar-size", "lg");
            } else {
                document.body.setAttribute("data-sidebar-size", "sm");
                localStorage.setItem("minia-sidebar-size", "sm");
            }
        }
    });

    // Activar el elemento de menú correspondiente a la página actual (sidebar)
    $("#sidebar-menu a").each(function() {
        const currentUrl = window.location.href.split(/[?#]/)[0];
        if (this.href === currentUrl) {
            $(this).addClass("active");
            $(this).parent().addClass("mm-active");
            $(this).parent().parent().addClass("mm-show");
            $(this).parent().parent().prev().addClass("mm-active");
            $(this).parent().parent().parent().addClass("mm-active");
            $(this).parent().parent().parent().parent().addClass("mm-show");
            $(this).parent().parent().parent().parent().parent().addClass("mm-active");
        }
    });

    // Scroll al elemento activo del menú lateral al cargar la página
    $(document).ready(function() {
        if ($("#sidebar-menu").length > 0 && $("#sidebar-menu .mm-active .active").length > 0) {
            const activeMenuItemOffsetTop = $("#sidebar-menu .mm-active .active").offset().top;
            if (activeMenuItemOffsetTop > 300) {
                const scrollDistance = activeMenuItemOffsetTop - 300;
                $(".vertical-menu .simplebar-content-wrapper").animate({ scrollTop: scrollDistance }, "slow");
            }
        }
    });

    // Activar el elemento de menú correspondiente a la página actual (navbar horizontal)
    $(".navbar-nav a").each(function() {
        const currentUrl = window.location.href.split(/[?#]/)[0];
        if (this.href === currentUrl) {
            $(this).addClass("active");
            $(this).parent().addClass("active");
            $(this).parent().parent().addClass("active");
            $(this).parent().parent().parent().addClass("active");
            $(this).parent().parent().parent().parent().addClass("active");
            $(this).parent().parent().parent().parent().parent().addClass("active");
            $(this).parent().parent().parent().parent().parent().parent().addClass("active");
        }
    });

    // Evento click del botón de pantalla completa
    $('[data-toggle="fullscreen"]').on("click", function(event) {
        event.preventDefault();
        $("body").toggleClass("fullscreen-enable");

        if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement) {
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        } else {
            const docElement = document.documentElement;
            if (docElement.requestFullscreen) {
                docElement.requestFullscreen();
            } else if (docElement.mozRequestFullScreen) {
                docElement.mozRequestFullScreen();
            } else if (docElement.webkitRequestFullscreen) {
                docElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        }
    });

    // Eventos para detectar cambios en el estado de pantalla completa
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    // Función para manejar el comportamiento de los menús desplegables de la barra de navegación superior
    (function() {
        if (document.getElementById("topnav-menu-content")) {
            const topnavLinks = document.getElementById("topnav-menu-content").getElementsByTagName("a");
            for (let i = 0; i < topnavLinks.length; i++) {
                topnavLinks[i].onclick = function(event) {
                    if (event && event.target && event.target.getAttribute("href") === "#") {
                        event.target.parentElement.classList.toggle("active");
                        if (event.target.nextElementSibling) {
                            event.target.nextElementSibling.classList.toggle("show");
                        }
                    }
                };
            }
            window.addEventListener("resize", collapseTopnavMenus);
        }
    })();

    // Inicializar tooltips, popovers y toasts de Bootstrap
    [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]')).map(function(tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
    [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]')).map(function(popoverTriggerEl) { return new bootstrap.Popover(popoverTriggerEl); });
    [].slice.call(document.querySelectorAll(".toast")).map(function(toastEl) { return new bootstrap.Toast(toastEl); });


    // Gestionar la configuración del layout
    if (window.sessionStorage) {
        const visitedLayout = sessionStorage.getItem("is_visited");
        if (visitedLayout) {
            $("#" + visitedLayout).prop("checked", true);
        } else {
            sessionStorage.setItem("is_visited", "layout-ltr");
        }
    }

    // Preloader
    $(window).on("load", function() {
        $("#status").fadeOut();
        $("#preloader").delay(350).fadeOut("slow");
    });


    const bodyElement = document.getElementsByTagName("body")[0]; // Mover la obtención del bodyElement aquí para claridad.

    // Evento click del botón de la barra lateral derecha (ajustes)
    $(".right-bar-toggle").on("click", function() {
        $("body").toggleClass("right-bar-enabled");
    });

    // Evento click del botón de modo oscuro/claro
    $("#mode-setting-btn").on("click", function() {
        if (bodyElement.hasAttribute("data-bs-theme") && bodyElement.getAttribute("data-bs-theme") === "dark") {
            document.body.setAttribute("data-bs-theme", "light");
            document.body.setAttribute("data-topbar", "light");
            document.body.setAttribute("data-sidebar", "light");
            if (!bodyElement.hasAttribute("data-layout") || bodyElement.getAttribute("data-layout") !== "horizontal") {
                document.body.setAttribute("data-sidebar", "light");
            }
            setCheckboxChecked("topbar-color-light");
            setCheckboxChecked("sidebar-color-light");
            setCheckboxChecked("topbar-color-light"); // Duplicado, corregir si es intencional
            localStorage.setItem("minia-theme", "light");
        } else {
            document.body.setAttribute("data-bs-theme", "dark");
            document.body.setAttribute("data-topbar", "dark");
            document.body.setAttribute("data-sidebar", "dark");
            if (!bodyElement.hasAttribute("data-layout") || bodyElement.getAttribute("data-layout") !== "horizontal") {
                document.body.setAttribute("data-sidebar", "dark");
            }
            setCheckboxChecked("layout-mode-dark");
            setCheckboxChecked("sidebar-color-dark");
            setCheckboxChecked("topbar-color-dark");
            localStorage.setItem("minia-theme", "dark");
        }
    });

    // Cerrar la barra lateral derecha al hacer click fuera de ella
    $(document).on("click", "body", function(event) {
        if ($(event.target).closest(".right-bar-toggle, .right-bar").length === 0) {
            $("body").removeClass("right-bar-enabled");
        }
    });


    // Establecer la configuración inicial del layout basada en los atributos data-* del body
    if (bodyElement.hasAttribute("data-layout") && bodyElement.getAttribute("data-layout") === "horizontal") {
        setCheckboxChecked("layout-horizontal");
        $(".sidebar-setting").hide();
    } else {
        setCheckboxChecked("layout-vertical");
    }

    // Aplicar el tema guardado en localStorage
    if (currentTheme === "dark") {
        document.body.setAttribute("data-bs-theme", "dark");
        document.body.setAttribute("data-topbar", "dark");
        document.body.setAttribute("data-sidebar", "dark");
        if (!bodyElement.hasAttribute("data-layout") || bodyElement.getAttribute("data-layout") !== "horizontal") {
            document.body.setAttribute("data-sidebar", "dark");
        }
        setCheckboxChecked("layout-mode-dark");
        setCheckboxChecked("sidebar-color-dark");
        setCheckboxChecked("topbar-color-dark");
    } else {
        document.body.setAttribute("data-bs-theme", "light");
        document.body.setAttribute("data-topbar", "light");
        document.body.setAttribute("data-sidebar", "light");
        if (!bodyElement.hasAttribute("data-layout") || bodyElement.getAttribute("data-layout") !== "horizontal") {
            document.body.setAttribute("data-sidebar", "light");
        }
        setCheckboxChecked("layout-mode-light");
        setCheckboxChecked("sidebar-color-light");
        setCheckboxChecked("topbar-color-light");
    }

    // Aplicar el tamaño de la barra lateral guardado en localStorage
    if (currentSidebarSize && bodyElement.getAttribute("data-layout") !== "horizontal") {
        document.body.setAttribute("data-sidebar-size", currentSidebarSize);
        if (currentSidebarSize === "sm") {
            setCheckboxChecked("sidebar-size-small");
        } else if (currentSidebarSize === "md") {
            setCheckboxChecked("sidebar-size-compact");
        } else {
            setCheckboxChecked("sidebar-size-default");
        }
    }

    if (bodyElement.hasAttribute("data-layout-size") && bodyElement.getAttribute("data-layout-size") === "boxed") {
        setCheckboxChecked("layout-width-boxed");
    } else {
        setCheckboxChecked("layout-width-fuild"); // Corregido "fuild" a "fluid" si es lo correcto, o mantener "fuild" si es intencional.
    }

    if (bodyElement.hasAttribute("data-layout-scrollable") && bodyElement.getAttribute("data-layout-scrollable") === "true") {
        setCheckboxChecked("layout-position-scrollable");
    } else {
        setCheckboxChecked("layout-position-fixed");
    }

    if (bodyElement.hasAttribute("data-topbar") && bodyElement.getAttribute("data-topbar") === "dark") {
        setCheckboxChecked("topbar-color-dark");
    } else {
        setCheckboxChecked("topbar-color-light");
    }

    if (bodyElement.hasAttribute("data-sidebar-size") && bodyElement.getAttribute("data-sidebar-size") === "sm") {
        setCheckboxChecked("sidebar-size-small");
    } else if (bodyElement.hasAttribute("data-sidebar-size") && bodyElement.getAttribute("data-sidebar-size") === "md") {
        setCheckboxChecked("sidebar-size-compact");
    } else {
        setCheckboxChecked("sidebar-size-default");
    }

    if (bodyElement.hasAttribute("data-sidebar") && bodyElement.getAttribute("data-sidebar") === "brand") {
        setCheckboxChecked("sidebar-color-brand");
    } else if (bodyElement.hasAttribute("data-sidebar") && bodyElement.getAttribute("data-sidebar") === "dark") {
        setCheckboxChecked("sidebar-color-dark");
    } else {
        setCheckboxChecked("sidebar-color-light");
    }

    if (document.getElementsByTagName("html")[0].hasAttribute("dir") && document.getElementsByTagName("html")[0].getAttribute("dir") === "rtl") {
        setCheckboxChecked("layout-direction-rtl");
    } else {
        setCheckboxChecked("layout-direction-ltr");
    }


    // Eventos para cambiar el layout, modo, dirección (RTL/LTR), etc.
    $("input[name='layout']").on("change", function() {
        window.location.href = $(this).val() === "vertical" ? "index.html" : "layouts-horizontal.html";
    });

    // Eventos para cambiar el tamaño de la barra lateral
    $("input[name='sidebar-size']").on("change", function() {
        if ($(this).val() === "small") {
            document.body.setAttribute("data-sidebar-size", "sm");
            localStorage.setItem("minia-sidebar-size", "sm");
        } else if ($(this).val() === "compact") {
            document.body.setAttribute("data-sidebar-size", "md");
            localStorage.setItem("minia-sidebar-size", "md");
        } else {
            document.body.setAttribute("data-sidebar-size", "lg");
            localStorage.setItem("minia-sidebar-size", "lg");
        }
    });

    $("input[name='layout-mode']").on("change", function() {
        if ($(this).val() === "light") {
            document.body.setAttribute("data-bs-theme", "light");
            document.body.setAttribute("data-topbar", "light");
            document.body.setAttribute("data-sidebar", "light");
            if (!bodyElement.hasAttribute("data-layout") || bodyElement.getAttribute("data-layout") !== "horizontal") {
                document.body.setAttribute("data-sidebar", "light");
            }
            setCheckboxChecked("topbar-color-light");
            setCheckboxChecked("sidebar-color-light");
            localStorage.setItem("minia-theme", "light");
        } else {
            document.body.setAttribute("data-bs-theme", "dark");
            document.body.setAttribute("data-topbar", "dark");
            document.body.setAttribute("data-sidebar", "dark");
            if (!bodyElement.hasAttribute("data-layout") || bodyElement.getAttribute("data-layout") !== "horizontal") {
                document.body.setAttribute("data-sidebar", "dark");
            }
            setCheckboxChecked("topbar-color-dark");
            setCheckboxChecked("sidebar-color-dark");
            localStorage.setItem("minia-theme", "dark");
        }
    });

    $("input[name='layout-direction']").on("change", function() {
        if ($(this).val() === "ltr") {
            document.getElementsByTagName("html")[0].removeAttribute("dir");
            $("#bootstrap-style").attr("href", "assets/css/bootstrap.min.css");
            $("#app-style").attr("href", "assets/css/app.min.css");
        } else {
            $("#bootstrap-style").attr("href", "assets/css/bootstrap-rtl.min.css");
            $("#app-style").attr("href", "assets/css/app-rtl.min.css");
            document.getElementsByTagName("html")[0].setAttribute("dir", "rtl");
        }
    });


    // Funcionalidad para checkboxes en tablas (checkAll)
    $("#checkAll").on("change", function() {
        $(".table-check .form-check-input").prop("checked", $(this).prop("checked"));
    });

    $(".table-check .form-check-input").change(function() {
        if ($(".table-check .form-check-input:checked").length === $(".table-check .form-check-input").length) {
            $("#checkAll").prop("checked", true);
        } else {
            $("#checkAll").prop("checked", false);
        }
    });


    // Inicializar Waves para efectos ripple
    Waves.init();

    // Inicializar Feather Icons
    feather.replace();

})(jQuery);