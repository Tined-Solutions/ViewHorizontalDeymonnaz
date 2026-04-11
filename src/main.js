import { React, createRoot, LazyMotion, MotionConfig, create, domAnimation } from "./runtime/react-motion.js";
import { CatalogExperience } from "./features/catalog-experience.js";
import { StatusScreen } from "./ui/status-screen.js";
import { catalogSignature, isCatalogReady } from "./shared/catalog.js";

const rootElement = document.getElementById("app");

function App({ utils, catalogSource, sanityConfig }) {
  const [catalog, setCatalog] = React.useState(null);
  const [screen, setScreen] = React.useState({
    title: "Conectando a Sanity",
    description: "Cargando inmuebles publicados.",
    details: "Si estas en local, usa npm run dev y agrega http://localhost:3000 como CORS origin en Sanity.",
  });

  React.useEffect(() => {
    let active = true;
    let unsubscribeCallback = null;

    async function loadCatalog() {
      setScreen({
        title: "Conectando a Sanity",
        description: "Cargando inmuebles publicados.",
        details: "Si estas en local, usa npm run dev y agrega http://localhost:3000 como CORS origin en Sanity.",
      });

      if (!catalogSource || typeof catalogSource.loadCatalog !== "function") {
        if (!active) {
          return;
        }

        setCatalog(null);
        setScreen({
          title: "Falta el cargador de Sanity",
          description: "No se encontro el cliente de Sanity en el navegador.",
          details: "Verifica que el script UMD se cargue antes del front.",
        });
        return;
      }

      try {
        const loadedCatalog = await catalogSource.loadCatalog(sanityConfig);

        if (!active) {
          return;
        }

        if (loadedCatalog && loadedCatalog.visualTheme) {
          utils.applyTheme(loadedCatalog.visualTheme);
        }

        setCatalog(loadedCatalog);

        if (!isCatalogReady(loadedCatalog)) {
          setScreen({
            title: loadedCatalog && loadedCatalog.state === "empty" ? "Sin inmuebles publicados" : loadedCatalog && loadedCatalog.state === "unconfigured" ? "Configura Sanity" : "Esperando datos",
            description: loadedCatalog && loadedCatalog.message ? loadedCatalog.message : "Completa la configuracion de Sanity y publica al menos un inmueble.",
            details: loadedCatalog && loadedCatalog.siteBaseUrl ? `Base de QR: ${loadedCatalog.siteBaseUrl}` : "",
          });
        }
        
        if (typeof catalogSource.listenCatalog === "function") {
          unsubscribeCallback = catalogSource.listenCatalog(sanityConfig, (updatedCatalog) => {
            if (active && updatedCatalog) {
              if (updatedCatalog.visualTheme) {
                utils.applyTheme(updatedCatalog.visualTheme);
              }
              
              setCatalog(updatedCatalog);
              
              if (!isCatalogReady(updatedCatalog)) {
                setScreen({
                  title: updatedCatalog.state === "empty" ? "Sin inmuebles publicados" : updatedCatalog.state === "unconfigured" ? "Configura Sanity" : "Esperando datos",
                  description: updatedCatalog.message ? updatedCatalog.message : "Completa la configuracion de Sanity y publica al menos un inmueble.",
                  details: updatedCatalog.siteBaseUrl ? `Base de QR: ${updatedCatalog.siteBaseUrl}` : "",
                });
              }
            }
          });
        }

      } catch (error) {
        if (!active) {
          return;
        }

        setCatalog(null);
        setScreen({
          title: "No se pudo conectar a Sanity",
          description: error instanceof Error ? error.message : "Revisa la configuracion del proyecto y el acceso CORS.",
          details: "Vuelve a intentarlo despues de corregir la conexion.",
        });
      }
    }

    loadCatalog();

    return () => {
      active = false;
      if (unsubscribeCallback) unsubscribeCallback();
    };
  }, [catalogSource, sanityConfig, utils]);

  const performanceMode = sanityConfig.tvPerformanceMode !== false;

  if (catalog && isCatalogReady(catalog)) {
    const configuredDurationMs = Number(sanityConfig.defaultDurationMs);
    const configuredPanelDelayMs = Number(sanityConfig.panelRevealDelayMs);

    return create(CatalogExperience, {
      key: catalogSignature(catalog),
      catalog,
      utils,
      siteBaseUrl: catalog.siteBaseUrl || sanityConfig.publicBaseUrl || "",
      defaultDurationMs: Number.isFinite(configuredDurationMs) && configuredDurationMs > 0 ? configuredDurationMs : 20000,
      performanceMode,
      panelRevealDelayMs: Number.isFinite(configuredPanelDelayMs) && configuredPanelDelayMs >= 0 ? configuredPanelDelayMs : 1000,
      dynamicPanelBlur: sanityConfig.panelDynamicBlur !== false,
    });
  }

  return create(StatusScreen, {
    ...screen,
    performanceMode,
  });
}

function startApp() {
  if (!rootElement) {
    return;
  }

  const utils = window.InmoUtils;
  const catalogSource = window.InmoCatalogSource;
  const sanityConfig = window.InmoSanityConfig || {};
  const performanceMode = sanityConfig.tvPerformanceMode !== false;

  if (!utils || !catalogSource) {
    const root = createRoot(rootElement);

    root.render(
      create(StatusScreen, {
        title: "Faltan los scripts base",
        description: "No se encontro la capa de utilidades o el cargador de contenido.",
        details: "Verifica que src/utils/format.js y src/data/sanity.js se carguen antes del modulo principal.",
        performanceMode,
      })
    );

    return;
  }

  const root = createRoot(rootElement);

  root.render(
    create(LazyMotion, { features: domAnimation },
      create(
        MotionConfig,
        {
          reducedMotion: "user",
          transition: {
            duration: 0.24,
            ease: "easeOut",
            layout: { type: "spring", stiffness: 170, damping: 24, mass: 0.82 },
          },
        },
        create(App, {
          utils,
          catalogSource,
          sanityConfig,
        })
      )
    )
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp, { once: true });
} else {
  startApp();
}
