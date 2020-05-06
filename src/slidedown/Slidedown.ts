import bowser from 'bowser';

import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import { addCssClass, addDomElement, getPlatformNotificationIcon, once, removeDomElement } from '../utils';
import { SlidedownPermissionMessageOptions } from '../models/Prompts';

export default class Slidedown {
  public options: SlidedownPermissionMessageOptions;
  public notificationIcons: NotificationIcons | null;

  static get EVENTS() {
    return {
      ALLOW_CLICK: 'slidedownAllowClick',
      CANCEL_CLICK: 'slidedownCancelClick',
      SHOWN: 'slidedownShown',
      CLOSED: 'slidedownClosed',
    };
  }

  constructor(options?: SlidedownPermissionMessageOptions) {
    if (!options) {
        options = MainHelper.getSlidedownPermissionMessageOptions(OneSignal.config.userConfig.promptOptions);
    }
    this.options = options;
    this.options.actionMessage = options.actionMessage.substring(0, 90);
    this.options.acceptButtonText = options.acceptButtonText.substring(0, 15);
    this.options.cancelButtonText = options.cancelButtonText.substring(0, 15);

    this.notificationIcons = null;
  }

  async create() {
    if (this.notificationIcons === null) {
      const icons = await MainHelper.getNotificationIcons();

      this.notificationIcons = icons;

      // Remove any existing container
      if (this.container) {
          removeDomElement('#onesignal-slidedown-container');
      }

      const icon = this.getPlatformNotificationIcon();
      let defaultIcon = `data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2239.5%22%20height%3D%2240.5%22%20viewBox%3D%220%200%2079%2081%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctitle%3EOneSignal-Bell%3C%2Ftitle%3E%3Cg%20fill%3D%22%23BBB%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M39.96%2067.12H4.12s-3.2-.32-3.2-3.36%202.72-3.2%202.72-3.2%2010.72-5.12%2010.72-8.8c0-3.68-1.76-6.24-1.76-21.28%200-15.04%209.6-26.56%2021.12-26.56%200%200%201.6-3.84%206.24-3.84%204.48%200%206.08%203.84%206.08%203.84%2011.52%200%2021.12%2011.52%2021.12%2026.56s-1.6%2017.6-1.6%2021.28c0%203.68%2010.72%208.8%2010.72%208.8s2.72.16%202.72%203.2c0%202.88-3.36%203.36-3.36%203.36H39.96zM27%2070.8h24s-1.655%2010.08-11.917%2010.08S27%2070.8%2027%2070.8z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E`;
      let dialogHtml = `<div id="normal-slidedown"><div class="slidedown-body"><div class="slidedown-body-icon"><img alt="notification icon" class="${icon === 'default-icon' ? 'default-icon' : ''}" src="${icon === 'default-icon' ? defaultIcon : icon}"></div><div class="slidedown-body-message">${this.options['actionMessage']}</div><div class="clearfix"></div></div><div class="slidedown-footer"><button id="onesignal-slidedown-allow-button" class="align-right primary slidedown-button">${this.options['acceptButtonText']}</button><button id="onesignal-slidedown-cancel-button" class="align-right secondary slidedown-button">${this.options['cancelButtonText']}</button><div class="clearfix"></div></div></div>`;

      // Insert the container
      addDomElement('body', 'beforeend',
          '<div id="onesignal-slidedown-container" class="onesignal-slidedown-container onesignal-reset"></div>');
      // Insert the dialog
      addDomElement(this.container, 'beforeend',
          `<div id="onesignal-slidedown-dialog" class="onesignal-slidedown-dialog">${dialogHtml}</div>`);
      // Animate it in depending on environment
      addCssClass(this.container, bowser.mobile ? 'slide-up' : 'slide-down');
      // Add click event handlers
      this.allowButton.addEventListener('click', this.onSlidedownAllowed.bind(this));
      this.cancelButton.addEventListener('click', this.onSlidedownCanceled.bind(this));
      Event.trigger(Slidedown.EVENTS.SHOWN);
    }
  }

  async onSlidedownAllowed(_: any) {
    await Event.trigger(Slidedown.EVENTS.ALLOW_CLICK);
  }

  onSlidedownCanceled(_: any) {
    Event.trigger(Slidedown.EVENTS.CANCEL_CLICK);
    this.close();
  }

  close() {
    addCssClass(this.container, 'close-slidedown');
    once(this.dialog, 'animationend', (event, destroyListenerFn) => {
      if (event.target === this.dialog &&
          (event.animationName === 'slideDownExit' || event.animationName === 'slideUpExit')) {
          // Uninstall the event listener for animationend
          removeDomElement('#onesignal-slidedown-container');
          destroyListenerFn();
          Event.trigger(Slidedown.EVENTS.CLOSED);
      }
    }, true);
  }

  getPlatformNotificationIcon(): string {
    return getPlatformNotificationIcon(this.notificationIcons);
  }

  get container() {
    return document.querySelector('#onesignal-slidedown-container');
  }

  get dialog() {
    return document.querySelector('#onesignal-slidedown-dialog');
  }

  get allowButton() {
    return document.querySelector('#onesignal-slidedown-allow-button');
  }

  get cancelButton() {
    return document.querySelector('#onesignal-slidedown-cancel-button');
  }
}

export function manageNotifyButtonStateWhileSlidedownShows() {
  const notifyButton = OneSignal.notifyButton;
  if (notifyButton &&
    notifyButton.options.enable &&
    OneSignal.notifyButton.launcher.state !== 'hidden') {
    OneSignal.notifyButton.launcher.waitUntilShown()
      .then(() => {
        OneSignal.notifyButton.launcher.hide();
      });
  }
  OneSignal.emitter.once(Slidedown.EVENTS.CLOSED, () => {
    if (OneSignal.notifyButton &&
      OneSignal.notifyButton.options.enable) {
      OneSignal.notifyButton.launcher.show();
    }
  });
}