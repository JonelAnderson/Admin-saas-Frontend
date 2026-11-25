
import { UserResponse } from "../../models/user-response.interface"; 
import { GenericValidators } from "@shared/validators/generic-validators";
import { TableColumns } from "@shared/models/list-table.interface";
import { SearchOptions } from "@shared/models/search-options.interface";
import { MenuItems } from "@shared/models/menu-items.interface";

const searchOptions: SearchOptions[] = [
  {
    label: "Buscar...",
    value: 1,
    placeholder: "Buscar",
    validation: [GenericValidators.defaultDescription],
    validation_desc: "Sólo se permite letras en esta búsqueda.",
    icon: "search",
  }
];

const menuItems: MenuItems[] = [
  {
    type: "link",
    id: "all",
    icon: "layers",
    label: "Todos",
  },
  {
    type: "link",
    id: "Activo",
    value: 1,
    icon: "check-circle",
    label: "Activo",
    class: {
      icon: "text-success",
    },
  },
  {
    type: "link",
    id: "Inactivo",
    value: 0,
    icon: "x-circle",
    label: "Inactivo",
    class: {
      icon: "text-danger",
    },
  },
];

const tableColumns: TableColumns<UserResponse>[] = [
  {
    label: "PERFIL",
    cssLabel: ["font-bold", "text-sm", "text-center"],
    property: "profilePictureDataUrl",
    cssProperty: ["font-semibold", "text-sm", "text-center"],
    type: "imagen-profile",
    sticky: true,   
    visible: true,
    download: true,
  },
  {
    label: "USUARIO",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "userName",
    cssProperty: ["text-sm","text-center"],
    type: "text",
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: "NOMBRE",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "firstName",
    cssProperty: ["text-sm", "text-center"],
    type: "text",
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: "APELLIDOS",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "lastName",
    cssProperty: ["text-sm", "text-center"],
    type: "text",
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: "CORREO",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "email",
    cssProperty: ["text-sm", "text-center"],
    type: "text",
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: "TELEFONO",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "phoneNumber",
    cssProperty: ["text-sm", "text-center"],
    type: "text",
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: "REPORTA A:",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "reportUser",
    cssProperty: ["text-sm", "text-center"],
    type: "text",
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: "ESTADO",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "userStatus",
    cssProperty: ["text-sm", "text-center"],
    type: "badge",
    sticky: false,
    visible: true,
    download: true,
  },

  {
    label: "MFA",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "mfaStatus",
    cssProperty: ["text-sm", "text-center"],
    type: "badge-two",
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: "BLOQUEADO",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "lockedUntilText",
    cssProperty: ["text-sm", "text-center"],
    type: "text",
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: "ACCIONES",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "actions",
    cssProperty: ["text-sm", "text-left"],
    type: "actions",
    sticky: false,
    visible: true,
    download: false,
  }

];

const filters = {
  numFilter: 0,
  textFilter: "",
  stateFilter: null,
  startDate: "",
  endDate: "",
  refresh: false,
};

const resetFilters = {
  numFilter: 0,
  textFilter: "",
  stateFilter: null,
  startDate: "",
  endDate: "",
  refresh: false,
};

const getInputs: string = "";

export const componentSettings = {

  // TABLE SETTINGS
  tableColumns: tableColumns,
 
  getInputs,
  // SEARCH FILTROS
  menuItems: menuItems,
  searchOptions: searchOptions,
  filters: filters,
  resetFilters,
  filename: "listado-de-usuarios",
};
