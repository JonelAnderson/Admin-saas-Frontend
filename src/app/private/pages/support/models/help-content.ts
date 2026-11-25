/**
 * Contenido del Centro de ayuda de la consola (/private/help). Se mantiene aquí, separado de la pantalla.
 * - Las `url` son las del menú (deploy/sql/menus-platform.sql del backend): el enlace "Ir a la pantalla" solo aparece si el
 *   usuario tiene esa pantalla en su menú; un módulo sin ninguna pantalla visible para el usuario no se muestra.
 * - Textos verificados contra las reglas del backend (Admin-saas-Backend/CLAUDE.md): si cambia una regla, actualizar aquí.
 */

export interface HelpTask {
  title: string;
  hint: string;
  url?: string;
}

export interface HelpModule {
  id: string;
  title: string;
  icon: string;
  summary: string;
  tasks: HelpTask[];
}

export interface HelpFaq {
  question: string;
  answer: string;
  /** Pantalla relacionada (opcional; solo se enlaza si está en el menú del usuario). */
  url?: string;
  urlLabel?: string;
}

export interface HelpStep {
  icon: string;
  title: string;
  text: string;
}

export interface HelpShortcut {
  keys: string;
  text: string;
}

/** Contacto de soporte. Vacíos = no se muestran (no se inventan teléfonos ni correos). */
export const SUPPORT_CONTACT: { email: string; phone: string; hours: string } = {
  email: '',
  phone: '',
  hours: ''
};

export const HELP_STEPS: HelpStep[] = [
  {
    icon: 'icon-shield',
    title: 'Ingrese con verificación en dos pasos',
    text: 'Después de la contraseña se pide el código de 6 dígitos de su app autenticadora. La primera vez se configura con un código QR.'
  },
  {
    icon: 'icon-briefcase',
    title: 'Registre el cliente y suscríbalo a un plan',
    text: 'En Clientes (con su RUC) y luego "Nueva suscripción": cada cliente puede tener una del ERP y una de la API SUNAT.'
  },
  {
    icon: 'icon-dollar-sign',
    title: 'Registre cada pago',
    text: 'En Pagos o desde la suscripción. El pago extiende el "pagado hasta" y reactiva una suscripción en gracia o suspendida por falta de pago.'
  },
  {
    icon: 'icon-help-circle',
    title: 'Use la ayuda de cada pantalla',
    text: 'El ícono de signo de pregunta junto al título explica qué hace la pantalla y cómo se calculan sus datos.'
  }
];

/** La consola no tiene atajos de teclado propios (la sección se oculta si la lista está vacía). */
export const POS_SHORTCUTS: HelpShortcut[] = [];

export const HELP_MODULES: HelpModule[] = [
  {
    id: 'commercial',
    title: 'Comercial',
    icon: 'icon-briefcase',
    summary: 'Clientes, planes, suscripciones y pagos del ERP y de la API SUNAT.',
    tasks: [
      { title: 'Registrar un cliente', hint: 'Con su RUC (se valida el dígito verificador) y un contacto para los avisos de cobro.', url: '/private/billing/customers' },
      { title: 'Suscribir un cliente a un plan', hint: 'Desde Clientes → "Nueva suscripción" o en Suscripciones. La prueba gratuita solo se da la primera vez.', url: '/private/billing/subscriptions' },
      { title: 'Registrar un pago', hint: 'Elija el cliente y su suscripción; el monto sugerido es precio pactado × ciclos.', url: '/private/billing/payments' },
      { title: 'Prorrogar, suspender o cancelar', hint: 'Acciones de la suscripción, siempre con motivo.', url: '/private/billing/subscriptions' },
      { title: 'Crear o cambiar un plan', hint: 'Precio mensual / anual, días de prueba y límites del producto.', url: '/private/billing/plans' }
    ]
  },
  {
    id: 'admin',
    title: 'Administración',
    icon: 'icon-settings',
    summary: 'Usuarios, roles, permisos, menús y auditoría de la consola.',
    tasks: [
      {
        title: 'Crear usuarios y restablecer su acceso',
        hint: 'También se restablece la verificación en dos pasos o se desbloquea una cuenta.',
        url: '/private/admin/users'
      },
      { title: 'Definir roles y permisos', hint: 'Qué pantallas y acciones tiene cada rol (Cobranzas, Soporte, Lectura…).', url: '/private/admin/roles' },
      { title: 'Revisar la auditoría', hint: 'Quién cambió qué y cuándo (solo SuperAdmin).', url: '/private/admin/audit-trails' }
    ]
  }
];

export const HELP_FAQ: HelpFaq[] = [
  {
    question: '¿Qué significa cada estado de una suscripción?',
    answer:
      'Prueba: dentro de los días gratis. Activa: pagada hasta hoy o después. En gracia: venció, pero todavía entra con aviso durante los días de gracia. Suspendida: pasó la gracia sin pago o se suspendió a mano. Cancelada: baja definitiva. Los estados se recalculan cada día a las 6:00 y con cada pago o acción.',
    url: '/private/billing/subscriptions',
    urlLabel: 'Ir a Suscripciones'
  },
  {
    question: 'Registré mal un pago, ¿cómo lo corrijo?',
    answer:
      'Los pagos no se editan: anúlelo (con motivo) y registre el correcto. Solo se puede anular el último pago de la suscripción; si hubo una prórroga después, primero ajuste la fecha con otra prórroga.',
    url: '/private/billing/payments',
    urlLabel: 'Ir a Pagos'
  },
  {
    question: '¿Desde cuándo cubre un pago?',
    answer:
      'Desde el día siguiente a "cubierto hasta": los días de gracia usados se pagan. Si la suscripción estuvo suspendida más allá de la gracia, el periodo empieza el día del pago (no se cobran los meses de corte).'
  },
  {
    question: 'Un cliente pide otra prueba gratuita.',
    answer:
      'La prueba se da una sola vez por cliente y producto, aunque la suscripción anterior se haya cancelado. Si se acuerda una cortesía, use "Prorrogar" con el motivo.'
  },
  {
    question: 'Reactivé una suscripción pero sigue suspendida.',
    answer:
      'Reactivar solo levanta la suspensión manual. Si además está vencida, sigue suspendida por falta de pago hasta registrar un pago o una prórroga.'
  },
  {
    question: 'Cambié o perdí mi teléfono con la app autenticadora, ¿cómo ingreso?',
    answer:
      'En el paso del código elija "Usar un código de recuperación" y escriba uno de los códigos que guardó al configurar la app (cada uno sirve una vez). Si no los tiene, pida al administrador que restablezca su verificación en dos pasos.'
  },
  {
    question: 'Mi cuenta quedó bloqueada.',
    answer:
      'Después de 5 intentos fallidos la cuenta se bloquea por 15 minutos. Espere ese tiempo o pida al administrador que la desbloquee desde Usuarios.',
    url: '/private/admin/users',
    urlLabel: 'Ir a Usuarios'
  },
  {
    question: '¿Qué contraseña puedo usar?',
    answer: 'De 8 a 16 caracteres, con al menos una mayúscula, una minúscula, un número y un carácter especial.'
  },
  {
    question: 'No veo una opción del menú o una pantalla.',
    answer:
      'El menú depende de su rol. Pida al administrador que le asigne el permiso o la pantalla en Roles. Después cierre sesión y vuelva a ingresar.',
    url: '/private/admin/roles',
    urlLabel: 'Ir a Roles'
  }
];
