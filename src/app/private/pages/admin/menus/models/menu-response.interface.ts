export interface MenuResponse {
    id: number;
    title: string;
    type: string;
    translate?: string;
    icon?: string;
    hidden: boolean;
    url?: string;
    classes?: string;
    exactMatch: boolean;
    external: boolean;
    target: boolean;
    breadcrumbs: boolean;
    badgeTitle?: string;
    badgeType?: string;
    disabled: boolean;
    order: number;
    menuParentId?: number;
    isActive: boolean;
    stateName:string;
    badgeColor:any
}
