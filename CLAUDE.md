# Consola de plataforma (frontend) — reglas para el agente

Frontend Angular 22 (zoneless) de la consola **interna** que gestiona el SaaS del ERP y la API SUNAT. Consume
`Admin-saas-Backend` (proyectos `DS.Platform.*`; sus reglas en `Admin-saas-Backend/CLAUDE.md`). Diseño:
`Docs/plataforma-consola-arquitectura.md`. Nació como copia de `ERP-Frontend` el 2026-11-23.

## Reglas generales

- Hablar con el usuario en español. No usar git. Leer un archivo completo antes de borrarlo o sobrescribirlo.
- Varios archivos usan `\r\n`: editar con la herramienta Edit o con un script de node que respete el fin de línea (no hay
  python).
- `eslint` marca `prefer-inject` en los constructores: es el estilo heredado del ERP, no un error nuevo.

## Lo que se quitó del ERP

- **No es multiempresa:** no hay `OrganizationContextService`, selector de empresa / sucursal / almacén, cabeceras
  `X-Company-Id` / `X-Branch-Id` ni recarga de pantalla por cambio de contexto. No volver a agregarlos.
- **Pantallas del ERP:** ventas, inventario, compras, finanzas, contabilidad, RR. HH., IA, reportes, empresas, sucursales,
  series y maestros. Los usuarios no tienen sucursal.
- **`endpoint.ts`:** solo lleva las claves que se usan. Una pantalla nueva agrega las suyas.

## Lo que se conserva del ERP (mismo comportamiento)

- **Login:** con MFA obligatorio, sesión y renovación (`AuthService`, `AuthInterceptor`). Los permisos y el menú se guardan
  solo en memoria (`SessionBootstrapService`).
- **Administración:** Usuarios, Roles, Menús y Auditoría (solo SuperAdmin).
- **Componentes reutilizables:** `app-list-table` (el servicio expone `GetAll(size, page, getInputs, lastId)`),
  `app-page-header`, filtros, `AlertModalService` y `RoleGuard` (`data.requiredPermission`).

## Comercial (`private/pages/billing`)

| Pantalla | Ruta | Componente |
| --- | --- | --- |
| Clientes | `/private/billing/customers` | `customers/customer-list` + `customer-form` (RUC con dígito verificador, `rucValidator`) |
| Suscripciones | `/private/billing/subscriptions` | `subscriptions/subscription-list` + `subscription-form` |
| Pagos | `/private/billing/payments` | `payments/payment-list` + `payment-register` |
| Planes | `/private/billing/plans` | `plans/plan-list` + `plan-form` |
| Avisos | `/private/billing/notifications` | `notifications/notification-list` (permiso `Notifications.Menu`) |

- **Suscripciones:**
  - El filtro por cliente llega por query string (`?customerId=&customer=`).
  - Acciones: registrar pago, ver pagos, editar, prorrogar, suspender, reactivar y cancelar. Todas las que cambian el estado
    piden motivo con `reason-modal`.
- **Pagos:**
  - El filtro por suscripción llega por query string (`?subscriptionId=&subscription=`).
  - El monto sugerido es precio pactado × ciclos. El periodo que cubre lo calcula el servidor.
  - Se anulan con motivo; nunca se editan.
- **Planes:** el formulario lleva la sección "API SUNAT" con el plan de la API que se aplica a las empresas del cliente (`apiPlanSlug`: free / pro / business). Es obligatorio en un plan de la API y opcional en uno del ERP (API incluida); los límites de emisores y comprobantes por mes solo aparecen si el plan lleva API.
- **Avisos:** bandeja de los correos que la consola envía a los clientes (por vencer, vence hoy, gracia, suspensión, constancia de pago y certificado por vencer). Se envían solos cada 5 minutos; no se crean ni editan aquí. Estados: Pendiente, Enviando, Enviado, Fallido (se reintenta), Abandonado y Omitido (el cliente no tiene correo de contacto, o caducó a los 3 días). **Reintentar** (`Notifications.Retry`) solo en Fallido o Abandonado. Filtros por estado, tipo y cliente (`?customerId=&customer=`). Modelos en `billing/models/notification.models.ts`, servicio en `billing/services/notification.services.ts`.
- **Piezas comunes:**
  - Modelos, enums y utilidades en `billing/models/billing.models.ts`; servicios en `billing/services/billing.services.ts`.
  - Ayudantes de listas y modales en `components/list-helpers.ts` (`col`, `actionsCol`, `query`, `openModal`, `runAction`).
  - Buscador de clientes con typeahead: `components/customer-picker.ts` (`GET Customer/Lookup`, máx. 30).
- **Fechas:** viajan como `yyyy-MM-dd` (fechas de Lima). Nunca pasarlas por `new Date()`, porque corren un día por la zona
  horaria. Se muestran con `ymdToDisplay`; el "hoy" de Lima es `limaTodayYmd()`. **Enums:** viajan como número.
- **Menús:** las rutas coinciden con `Admin-saas-Backend/deploy/sql/menus-platform.sql`. Una pantalla nueva va en los dos
  lados.

## API SUNAT (`private/pages/api-sunat`)

| Pantalla | Ruta | Componente | Permiso |
| --- | --- | --- | --- |
| Emisores | `/private/api-sunat/issuers` | `issuers/issuer-list` + `issuer-link` (modal) | `ApiSunatIssuers.Menu` |
| Acciones remotas | `/private/api-sunat/remote-actions` | `remote-actions/remote-action-list` | `RemoteActions.Menu` |
| Portal | `/private/api-sunat/portal` | `portal/portal-list` + `portal-invite` (modal) | `PortalAccess.Menu` |

- **Emisores:** empresas de la API SUNAT vinculadas a un cliente. Vincular busca la empresa en la API (`GET ApiSunatIssuer/Tenants`,
  máx. 30; RUC y razón social se leen de ahí, no se escriben). La emisión se suspende y reactiva sola según las suscripciones del
  cliente (por falta de pago: consulta y descarga siguen, la emisión nueva responde 402): la pantalla solo muestra el estado
  ("Emite", "Suspensión en camino", "Emisión suspendida"), sincroniza y desvincula (no se puede mientras esté suspendida). El
  filtro por cliente llega por `?customerId=&customer=`.
- **Acciones remotas:** bandeja de lo que la consola envió a la API (Pendiente, Enviando, Hecha, Fallida, Abandonada, Cancelada).
  Reintentar solo en Fallida o Abandonada. El filtro por emisor llega por `?issuerId=&issuer=`.
- **Portal** (fase C6, `GET v1/PortalAccess`): personas de cada cliente que entran al portal de clientes de la API SUNAT y a qué empresas. **Invitar** (`PortalAccess.Invite`, modal `PortalInviteComponent`: cliente, correo, nombre, empresas del cliente —se cargan con `ApiSunatIssuer?customerId=`— y casilla "restablecer MFA") guarda la invitación; en unos minutos la persona recibe por correo el enlace de activación (72 h, un solo uso). **La consola nunca ve ni muestra ese enlace ni el token.** **Reinvitar** es el mismo modal con cliente y correo fijos (dar otras empresas, volver a habilitar, perdió su contraseña o su teléfono). **Deshabilitar / Habilitar** (`PortalAccess.Manage`; habilitar solo si ya tiene usuario) y **Reintentar** solo en Fallido o Abandonado. Estados como las acciones remotas ("Invitar: Pendiente", "Al día"); aviso amarillo si el servidor no tiene `Portal:PublicUrl` (`GET v1/PortalAccess/Settings`, respuesta sin sobre `Result`). Filtros por acceso, estado, texto y `?customerId=&customer=`. Modelos y servicio (`PortalAccessService`) en `api-sunat/models/api-sunat.models.ts` y `services/api-sunat.services.ts`.
- Reutiliza de `billing` los ayudantes (`list-helpers`), `CustomerPicker` y `serverMessages`. Las fecha-hora del servidor llegan en
  UTC y se muestran en Lima con `utcToLima` (`api-sunat.models.ts`).

## ERP (`private/pages/erp`)

| Pantalla | Ruta | Componente | Permiso |
| --- | --- | --- | --- |
| Instancias | `/private/erp/instances` | `instances/instance-list` + `instance-form` + `instance-key` + `instance-provision` + `instance-upgrade` (modales) | `Instances.Menu` |
| Despliegues | `/private/erp/deployments` | `deployments/deployment-list` | `Deployments.Menu` |
| Credenciales al ERP | `/private/erp/api-credentials` | `api-credentials/api-credential-list` + `api-credential-create` (modal) | `ApiCredentialDeliveries.Menu` |

- **Instancias:** cada ERP de un cliente con su licencia (Activa / En gracia / Suspendida / Cancelada, la que recibiría hoy según la
  suscripción del ERP de su cliente), su último contacto (En línea / Con demora / Sin contacto / Nunca) y el uso que informa. Las que
  no se conectan salen primero. La clave de licencia se muestra **una sola vez** (al crear o generar una nueva, `InstanceKeyComponent`):
  nunca guardarla ni volver a pedirla. Filtro por cliente con `?customerId=&customer=`. La columna Stack dice si la instancia es
  "Manual" o la montó la consola ("Consola vX").
- **Montar en Coolify** (fase C5, `Deployments.Provision`): solo para una instancia que no tiene stack y nunca se conectó. El modal pide
  subdominio (`{subdominio}.{baseDomain}`) y versión de las imágenes (precargada con `Provisioning:DefaultVersion`; "latest" no se acepta) y
  avisa si el servidor no tiene configurado Provisioning / Coolify (`GET v1/Deployment/Settings`, respuesta sin sobre `Result`). Renueva la
  clave de licencia de la instancia y encola el despliegue (corre en segundo plano). Al terminar muestra **una sola vez** la contraseña
  inicial del usuario `administrador` del ERP del cliente (`InstanceProvisionComponent`): nunca guardarla ni volver a pedirla.
- **Actualizar versión** (`Deployments.Upgrade`): solo con stack montado por la consola y versión desplegada conocida; cambia la versión
  de las imágenes y reinicia el stack (corte breve; el ERP aplica sus migraciones al arrancar).
- **Despliegues** (`erp/deployments`, `GET v1/Deployment`): bandeja de lo que la consola hace en Coolify, con los mismos estados que las
  acciones remotas (Pendiente, En curso, Hecho, Fallido, Abandonado, Cancelado); un Montar muestra su paso (servicio creado → variables
  cargadas → arranque pedido) y un reintento continúa donde quedó. **Reintentar** (`Deployments.Retry`) solo en Fallido o Abandonado;
  **Cancelar** en Pendiente, Fallido o Abandonado: borra los secretos guardados pero **la consola nunca borra stacks ni bases de
  clientes**; si el servicio ya existía en Coolify el mensaje dice cuál eliminar a mano. Filtros por estado, texto y
  `?instanceId=&instance=` / `?customerId=&customer=`. Modelos en `erp/models/deployment.models.ts`, servicio en
  `erp/services/deployment.services.ts`.

- **Credenciales al ERP** (fase C6b, `GET v1/ApiCredentialDelivery`): entrega de las credenciales de la API SUNAT de una empresa al ERP de su cliente. **Entregar credenciales** (`ApiCredentialDeliveries.Create`, modal `ApiCredentialCreateComponent`: cliente, instancia activa y empresa vinculada del cliente, y la casilla obligatoria "las credenciales actuales dejarán de funcionar") solo guarda la entrega; la consola las pide a la API y el ERP las recoge solo. **La pantalla nunca muestra ni recibe una key o un secret** (la fila solo trae el estado: Pendiente, En curso, Lista —con "sin recoger" / "falta su confirmación" y su vencimiento—, Entregada, Fallida, Abandonada, Cancelada, Vencida). **Reintentar** (`Retry`) en Fallida o Abandonada; **Cancelar** (`Cancel`) en Pendiente, Fallida, Abandonada o Lista (borra lo guardado; en Lista avisa que la API ya las regeneró). Aviso amarillo si falta `ApiSunat:PublicUrl` (`GET v1/ApiCredentialDelivery/Settings`, respuesta sin sobre `Result`). Filtros por estado, texto y `?customerId=&customer=`. Modelos en `erp/models/api-credential.models.ts`, servicio en `erp/services/api-credential.services.ts`.

## Inicio y tablero (`private/pages/home`)

- `Inicio` muestra, sobre los accesos directos, el **tablero** (`GET v1/Dashboard`, solo si el usuario tiene `Permissions.Dashboards.View`; sin ese permiso ni se pide): suscripciones por estado, cobrado del mes por moneda, vencimientos de los próximos 7 días, instancias del ERP sin contacto o desactualizadas, acciones remotas y avisos que piden atención y el resumen de la API SUNAT (certificados por vencer o vencidos, rechazos de hoy y del mes, pendientes, trabajos fallidos).
- La parte de la **API SUNAT puede venir no disponible** (`api.available = false` con el motivo en `api.error`): se muestra un aviso discreto y el resto del tablero sigue igual. Se pide al abrir y con el botón Actualizar. Contrato en `home/models/dashboard.models.ts`; las fechas llegan `yyyy-MM-dd` y se muestran con `ymdToDisplay`.

## Desarrollo

- `npm ci --legacy-peer-deps` (los peer deps del proyecto lo exigen).
- `ng serve`: https://localhost:4210 (el ERP usa 4200). `proxy.conf.json` reenvía `/api` y `/Usuarios` a la API de la consola en
  https://localhost:5011 (el ERP usa 5001). **Nunca apuntar el proxy ni `src/_redirects` al ERP.**
- Verificar después de cada cambio: `npx ng build --configuration development` y, antes de publicar,
  `npx ng build --configuration production`.
