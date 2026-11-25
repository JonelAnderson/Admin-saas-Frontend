import { TableColumns } from "@shared/models/list-table.interface";
import { RoleResponse } from "../../models/role-response.interface";

const tableColumns: TableColumns<RoleResponse>[] = [
  
  {
    label: "NOMBRE",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "name",
    cssProperty: ["text-sm", "text-center"],
    type: "text",
    sticky: true,
    visible: true,
    download: true,
  },
  {
    label: "DESCRIPCIÖN",
    cssLabel: ["font-bold", "text-sm","text-center"],
    property: "description",
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




export const componentSettings = {
  tableColumns,
};




