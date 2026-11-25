// angular import
import { Component, DoCheck, OnDestroy, OnInit, computed, effect, inject } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

// bootstrap import
import { NgbDropdownConfig, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SecurityComponent } from 'src/app/private/pages/admin/management/user/components/security/security.component';

// project import
import { CurrentUserProfileService } from '@shared/service/current-user-profile.service';

// third party
import { TranslateService } from '@ngx-translate/core';
import screenfull from 'screenfull';
import { SharedModule } from '@shared/shared.module';
import { GradientAppConfig } from 'src/app/app-gradient-config';
import { AuthService } from 'src/app/public/pages/login/services/auth.service';
import { ThemeService } from '@shared/service/customs-theme.service';

import { PreferenceService } from '@shared/service/preference.service';

import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-nav-right',
  imports: [SharedModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss'],
  providers: [NgbDropdownConfig],
  animations: [
    trigger('slideInOutLeft', [
      transition(':enter', [style({ transform: 'translateX(100%)' }), animate('300ms ease-in', style({ transform: 'translateX(0%)' }))]),
      transition(':leave', [animate('300ms ease-in', style({ transform: 'translateX(100%)' }))])
    ]),
    trigger('slideInOutRight', [
      transition(':enter', [style({ transform: 'translateX(-100%)' }), animate('300ms ease-in', style({ transform: 'translateX(0%)' }))]),
      transition(':leave', [animate('300ms ease-in', style({ transform: 'translateX(-100%)' }))])
    ])
  ]
})
export class NavRightComponent implements DoCheck, OnInit, OnDestroy {
  authenticationService = inject(AuthService);
  private translate = inject(TranslateService);
  private themeService = inject(ThemeService);
  private preferenceService = inject(PreferenceService);
  private modalService = inject(NgbModal);
  private profile = inject(CurrentUserProfileService);

  // public props
  visibleUserList: boolean;
  chatMessage: boolean;
  friendId!: number;
  gradientConfig = GradientAppConfig;
  direction = 'ltr';
  screenFull: boolean = true;

  QAEnvironment: boolean;

  // Nombre y foto de GET identity/account/me (en memoria; el JWT ya no los lleva).
  readonly userName = computed(() => this.profile.profile()?.fullName || 'Usuario');
  readonly userImage = computed(() => this.profile.profile()?.profilePictureUrl || 'assets/images/user/user-icon.png');
  // constructor
  constructor() {
    this.visibleUserList = false;
    this.chatMessage = false;
    effect(() => {
      this.isRtlMode(this.themeService.isRtlTheme());
    });
  }

  // private method
  private isRtlMode(isRtl: boolean) {
    this.direction = isRtl === true ? 'rtl' : 'ltr';
  }

  // life cycle hook
  ngOnInit() {
    setTimeout(() => {
      this.translate.use(GradientAppConfig.i18n);
    }, 0);
    if (screenfull.isEnabled) {
      this.screenFull = screenfull.isFullscreen; // Initialize based on current fullscreen state
      screenfull.on('change', () => {
        this.screenFull = screenfull.isFullscreen;
      });
    }

    //this.QAEnvironment = environment.isTestEnvironment;
  }
  ngDoCheck() {
    if (document.querySelector('body')?.classList.contains('elite-rtl')) {
      this.gradientConfig.isRtlLayout = true;
    } else {
      this.gradientConfig.isRtlLayout = false;
    }
  }

  // public method
  onChatToggle(friendID: number) {
    this.friendId = friendID;
    this.chatMessage = !this.chatMessage;
  }

  logout() {
    this.authenticationService.logout();
  }

  /** Mi perfil → Seguridad (MFA y contraseña, Fase 12a). */
  openSecurity() {
    this.modalService.open(SecurityComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }

  // full screen toggle
  toggleFullscreen() {
    if (screenfull.isEnabled) {
      screenfull.toggle().then(() => {
        this.screenFull = screenfull.isFullscreen;
      });
    }
  }

  ngOnDestroy() {
    if (screenfull.isEnabled) {
      screenfull.off('change', () => {
        this.screenFull = screenfull.isFullscreen;
      });
    }
  }

  useLanguage(language: string) {
    this.translate.use(language);
    localStorage.setItem('currentLang', language);

    let backendLanguageCode = 'en-US';
    switch (language) {
      case 'es':
        backendLanguageCode = 'es-ES';
        break;
      case 'fr':
        backendLanguageCode = 'fr-FR';
        break;
      case 'en':
        backendLanguageCode = 'en-US';
        break;
        // Add more cases as needed based on backend support
      default:
        backendLanguageCode = 'en-US';
        break;
    }
    
    this.preferenceService.changeLanguage(backendLanguageCode).subscribe();
  }
}
