import { TableColumns } from '@shared/models/list-table.interface';
import { MenuResponse } from '../../models/menu-response.interface';
import { SearchOptions } from '@shared/models/search-options.interface';
import { GenericValidators } from '@shared/validators/generic-validators';
import { MenuItems } from '@shared/models/menu-items.interface';

const searchOptions: SearchOptions[] = [
  {
    label: 'Título',
    value: 1,
    placeholder: 'Buscar por Título',
    validation: [GenericValidators.defaultDescription],
    validation_desc: 'Solo se permiten letras y números.',
    icon: "search",
  },
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

const TABLE_COLUMNS: TableColumns<MenuResponse>[] = [
  {
    label: 'TITULO',
    cssLabel: ['font-bold', 'text-sm'],
    property: 'title',
    cssProperty: ['font-semibold', 'text-sm', 'text-left'],
    subProperty: '',
    type: 'text',
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: 'TIPO',
    cssLabel: ['font-bold', 'text-sm'],
    property: 'type',
    cssProperty: ['font-semibold', 'text-sm', 'text-left'],
    subProperty: '',
    type: 'text',
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: 'URL',
    cssLabel: ['font-bold', 'text-sm'],
    property: 'url',
    cssProperty: ['font-semibold', 'text-sm', 'text-left'],
    subProperty: '',
    type: 'text',
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: 'ORDEN',
    cssLabel: ['font-bold', 'text-sm'],
    property: 'order',
    cssProperty: ['font-semibold', 'text-sm', 'text-left'],
    subProperty: '',
    type: 'text',
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: 'ICONO',
    cssLabel: ['font-bold', 'text-sm'],
    property: 'icon',
    cssProperty: ['font-semibold', 'text-sm', 'text-left'],
    subProperty: '',
    type: 'icon', 
    sticky: false,
    visible: true,
    download: true,
  },
  {
    label: 'ESTADO',
    cssLabel: ['font-bold', 'text-sm'],
    property: 'stateName',
    cssProperty: ['font-semibold', 'text-sm', 'text-left'],
    subProperty: '',
    type: 'badge',
    sticky: false,
    visible: true,
    download: true,
  },
   {
    label: "ACCIONES",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "actions",
    cssProperty: ["text-sm", "text-center"],
    type: "actions",
    sticky: false,
    visible: true,
    download: false,
  },
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
 searchOptions,
  TABLE_COLUMNS,
  filters,
  resetFilters,
  getInputs,
  menuItems,
  filename: "listado-de-menus",
};
