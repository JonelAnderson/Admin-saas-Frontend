import { Injectable } from '@angular/core';

/**
 * Pasa el Id del registro elegido (rol, usuario) a la pantalla siguiente, también si se recarga. En sessionStorage (solo
 * esta pestaña, se borra al cerrarla), no en localStorage. Se quitaron los métodos de "préstamo" de la plantilla, sin uso.
 */
@Injectable({
  providedIn: 'root'
})
export class IdTransferService {
  private id: any;
  private readonly idKey = 'selectedIdKey';

  setId(id: any) {
    this.id = id;
  }

  getId() {
    return this.id;
  }

  setSelectedIdKey(id: any) {
    try {
      sessionStorage.setItem(this.idKey, id.toString());
    } catch {
      // sin sessionStorage queda en memoria
    }
    this.id = id;
  }

  getSelectedIdKey() {
    try {
      const storedId = sessionStorage.getItem(this.idKey);
      if (storedId) {
        return storedId;
      }
    } catch {
      // sin sessionStorage
    }
    return this.id != null ? String(this.id) : null;
  }
}
