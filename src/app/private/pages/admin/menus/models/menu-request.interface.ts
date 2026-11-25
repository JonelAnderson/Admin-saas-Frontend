export interface MenuRequest {
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
    permissions?: string[];
    order: number;
    menuParentId?: number;
}
