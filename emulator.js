import { QuickShot, SingleTouchButton, SingleTouchButtonCallbackListener } from './mobile-touch-controls.js'

let nostalgistModule
let baseUrl = window.location.origin
baseUrl += "/v01/emulator"
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}
class GameFocusManager {
  static #instance = null
  #isGameFocusOn
  #nostalgist
  constructor(nostalgist, initialState = false) {
    if (GameFocusManager.#instance) {
      throw new Error('Assertion error.')
    }
    this.#nostalgist = nostalgist
    this.#isGameFocusOn = initialState
    GameFocusManager.#instance = this
  }
  static initialize(nostalgist, initialState = false) {
    if (!GameFocusManager.#instance) {
      GameFocusManager.#instance = new GameFocusManager(nostalgist, initialState)
    }
    return GameFocusManager.#instance
  }
  static getInstance() {
    if (!GameFocusManager.#instance) {
      throw new Error('Assertion error.')
    }
    return GameFocusManager.#instance
  }
  #toggle() {
    this.#isGameFocusOn = !this.#isGameFocusOn
    this.#sendCommand()
  }
  enable() {
    if (!this.#isGameFocusOn) {
      this.#toggle()
    }
  }
  disable() {
    if (this.#isGameFocusOn) {
      this.#toggle()
    }
  }
  #sendCommand() {
    this.#nostalgist.sendCommand('GAME_FOCUS_TOGGLE')
  }
}
const Emulator = {
  nostalgist: undefined,
  gameFocusManager: null,
  menuCreated: false,
  keyboardMode: 'Joystick - kursory, Fire - Z',
  currentRomName: '',
  menuTimeout: null,
  menuVisible: true,
  menuHideDelay: 3000,
  quickShot: null,
  init() {
    this.applyStyles()
    this.observeNewElements()
    this.loadNostalgist()
    this.checkLinks()
    if (!isMobile()) {
      this.setupMenuAutoHide()
    } else {
      this.mobileCleanup = this.setupMobileOptimizations()
    }
  },
  async loadNostalgist() {
    if (!nostalgistModule) {
      try {
        const module = await import(`${baseUrl}/nostalgist.js`)
        nostalgistModule = module.Nostalgist
      } catch (error) {
        console.error('Error importing Nostalgist:', error)
      }
    }
  },
  checkLinks() {
    const links = document.querySelectorAll('a')
    links.forEach(link => {
      if (this.shouldAddEmulator(link)) {
        this.addEmulator(link)
      }
    })
  },
  shouldAddEmulator(link) {
    const validExtensions = ['.xex', '.atr', '.cas', '.bin', '.car', '.xfd', '.atx', '.dcm', '.bas', '.obx']
    const validPlatforms = ['a8']
    const href = link.getAttribute('href')
    if (null == href) return false
    if (validExtensions.some(ext => href.toLowerCase().endsWith(ext.toLowerCase()))) return true
    const parentClass = link.parentElement?.className || ''
    if (validExtensions.some(ext => parentClass.toLowerCase().includes(ext.slice(1).toLowerCase()))) {
      return true
    }
    return validPlatforms.includes(link.dataset.emulation?.toLowerCase())
  },
  addEmulator(link) {
    const label = document.createElement('span')
    label.textContent = 'Emu'
    label.style.cursor = 'pointer'
    label.style.color = 'white'
    label.style.backgroundColor = '#007bff'
    label.style.fontSize = '10px'
    label.style.fontWeight = 'bold'
    label.style.padding = '4px 8px'
    label.style.border = '1px solid #0056b3'
    label.style.borderRadius = '12px'
    label.style.marginRight = '8px'
    label.style.display = 'inline-block'
    label.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)'
    label.setAttribute('data-emu-button', 'true')
    label.addEventListener('mouseenter', () => {
      label.style.backgroundColor = '#0056b3'
    })
    label.addEventListener('mouseleave', () => {
      label.style.backgroundColor = '#007bff'
    })
    label.addEventListener('click', () => {
      const defaultConfig = this.guessConfig(link.href)
      this.createSettingsPopup(
        defaultConfig,
        link.href,
        () => { },
        (settings) => {
          this.emulate(link.getAttribute('href'), link.dataset.emulation, settings)
        }
      )
    })
    link.parentNode.insertBefore(label, link)
  },
  extractFileName(url) {
    try {
      return decodeURIComponent(url.split('/').pop())
    } catch (e) {
      return url.split('/').pop()
    }
  },
  guessBIOS(name) {
    let defaultBios = ['ATARIXL.ROM', 'ATARIBAS.ROM']
    const biosTags = {
      "[400-800]": ['ATARIOSB.ROM', 'ATARIBAS.ROM'],
      "[REQ OSA]": ['ATARIOSA.ROM', 'ATARIBAS.ROM'],
      "[REQ OSB]": ['ATARIOSB.ROM', 'ATARIBAS.ROM'],
      "(osa)": ['ATARIOSA.ROM', 'ATARIBAS.ROM'],
      "(osb)": ['ATARIOSB.ROM', 'ATARIBAS.ROM']
    }
    for (let tag in biosTags) {
      if (name.toLowerCase().includes(tag.toLowerCase())) {
        return biosTags[tag]
      }
    }
    return defaultBios
  },
  guessConfig(name) {
    const tosecRules = {
      "[BASIC]": {
        atari800_internalbasic: "enabled"
      },
      "(130XE)": {
        atari800_system: "130XE (128K)"
      },
      "[130XE]": {
        atari800_system: "130XE (128K)"
      },
      "[128K]": {
        atari800_system: "130XE (128K)"
      },
      "(128)": {
        atari800_system: "130XE (128K)"
      },
      "[192K]": {
        atari800_system: "Modern XL/XE(320K CS)"
      },
      "[REQ 256K]": {
        atari800_system: "Modern XL/XE(320K CS)"
      },
      "[256K]": {
        atari800_system: "Modern XL/XE(320K CS)"
      },
      "[320K]": {
        atari800_system: "Modern XL/XE(320K CS)"
      },
      "[1MB]": {
        atari800_system: "Modern XL/XE(1088K)"
      },
      "[400-800]": {
        atari800_system: "400/800 (OS B)"
      },
      "[REQ OSA]": {
        atari800_system: "400/800 (OS A)"
      },
      "[REQ OSB]": {
        atari800_system: "400/800 (OS B)",
        atari800_ntscpal: 'NTSC'
      },
      "[STEREO]": {},
      ".CAS": {
        atari800_cassboot: "enabled"
      },
      ".BAS": {
        atari800_internalbasic: "enabled"
      }
    }
    const kazRules = {
      "(128)": {
        atari800_system: "130XE (128K)"
      },
      "(256)": {
        atari800_system: "Modern XL/XE(320K CS)"
      },
      "(320)": {
        atari800_system: "Modern XL/XE(320K CS)"
      },
      "(ntsc)": {
        atari800_ntscpal: 'NTSC'
      },
      "(osa)": {
        atari800_system: "400/800 (OS A)"
      },
      "(osb)": {
        atari800_system: "400/800 (OS B)"
      },
      "(b)": {
        atari800_internalbasic: "enabled"
      }
    }
    const defaultOptions = {
      atari800_ntscpal: 'PAL',
      atari800_resolution: '336x240',
      atari800_system: '800XL (64K)'
    }
    let config = { ...defaultOptions }
    const kazTagsMatch = name.match(/\((.*?)\)/g)
    if (kazTagsMatch) {
      kazTagsMatch.forEach(tagGroup => {
        const tags = tagGroup.slice(1, -1).split(',')
        tags.forEach(tag => {
          const fullTag = `(${tag.trim()})`
          if (kazRules[fullTag]) {
            Object.assign(config, kazRules[fullTag])
          }
        })
      })
    }
    Object.keys(tosecRules).forEach(tag => {
      if (name.toUpperCase().includes(tag)) {
        Object.assign(config, tosecRules[tag])
      }
    })
    return config
  },
  createSettingsPopup(defaultConfig, fileUrl, onClose, onLaunch) {
    const popup = document.createElement('div')
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `
    const content = document.createElement('div')
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    `
    const header = document.createElement('div')
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    `
    const title = document.createElement('p')
    title.textContent = 'Uruchom emulację'
    title.style.cssText = `
      margin: 0;
      font-size: 1em;
      font-weight: bold;
    `
    const closeButton = document.createElement('button')
    closeButton.innerHTML = '&times;'
    closeButton.style.cssText = `
      border: none;
      background: none;
      font-size: 1.5em;
      cursor: pointer;
      padding: 0 5px;
    `
    closeButton.onclick = () => {
      popup.remove()
      onClose()
    }
    header.appendChild(title)
    header.appendChild(closeButton)
    content.appendChild(header)
    const form = document.createElement('form')
    form.onsubmit = (e) => {
      e.preventDefault()
      const formData = new FormData(form)
      const settings = Object.fromEntries(formData)
      popup.remove()
      onLaunch(settings)
    }
    const createSelectGroup = (labelText, name, options, defaultValue, inline = false) => {
      const group = document.createElement('div')
      group.style.cssText = inline ? 'flex: 1; margin-right: 5px;' : ''
      const label = document.createElement('label')
      label.textContent = labelText
      label.style.cssText = `
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      `
      const select = document.createElement('select')
      select.name = name
      select.style.cssText = `
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 10px;
      `
      options.forEach(([value, text]) => {
        const option = document.createElement('option')
        option.value = value
        option.textContent = text
        if (value === defaultValue) {
          option.selected = true
        }
        select.appendChild(option)
      })
      group.appendChild(label)
      group.appendChild(select)
      return group
    }
    form.appendChild(createSelectGroup('System / RAM', 'atari800_system', [
      ['800XL (64K)', 'Atari 800XL (64KB)'],
      ['130XE (128K)', 'Atari 130XE (128KB)'],
      ['Modern XL/XE(320K CS)', 'Atari XE +320KB RAM '],
      ['Modern XL/XE(1088K)', 'Atari XE +1MB RAM'],
      ['400/800 (OS A)', 'Atari 400/800 48KB (OS A)'],
      ['400/800 (OS B)', 'Atari 400/800 48KB (OS B)']
    ], defaultConfig.atari800_system))

    const rowContainer = document.createElement('div')
    rowContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    `
    rowContainer.appendChild(createSelectGroup('BASIC', 'atari800_internalbasic', [
      ['disabled', 'Nie'],
      ['enabled', 'Tak']
    ], defaultConfig.atari800_internalbasic, true))
    rowContainer.appendChild(createSelectGroup('System TV', 'atari800_ntscpal', [
      ['PAL', 'PAL'],
      ['NTSC', 'NTSC']
    ], defaultConfig.atari800_ntscpal, true))
    form.appendChild(rowContainer)

    const guessedControls = this.guessControls();
    form.appendChild(createSelectGroup('Sterowanie', 'mode', [
      ['keyboard', 'Klawiatura'],
      ['touch', 'Dotyk'],
      ['gamepad', 'Gamepad']
    ], guessedControls))

    if (fileUrl.toLowerCase().endsWith('.cas')) {
      form.appendChild(createSelectGroup('Autostart kasety', 'atari800_cassboot', [
        ['disabled', 'Wyłączony'],
        ['enabled', 'Włączony']
      ], defaultConfig.atari800_cassboot))
    }
    const buttonGroup = document.createElement('div')
    buttonGroup.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 5px;
    `
    const cancelButton = document.createElement('button')
    cancelButton.textContent = 'Anuluj'
    cancelButton.type = 'button'
    cancelButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f5f5f5;
      cursor: pointer;
    `
    cancelButton.onclick = closeButton.onclick
    const submitButton = document.createElement('button')
    submitButton.textContent = 'Uruchom'
    submitButton.type = 'submit'
    submitButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: #007bff;
      color: white;
      cursor: pointer;
    `
    buttonGroup.appendChild(cancelButton)
    buttonGroup.appendChild(submitButton)
    form.appendChild(buttonGroup)
    content.appendChild(form)
    popup.appendChild(content)
    document.body.appendChild(popup)
    return popup
  },
  guessControls() {
    if (isMobile()) {
      return 'touch';
    } else {
      return 'keyboard';
    }
  },
  async enableWebGLPiP(canvas) {
    if (!canvas.captureStream) {
      console.error('captureStream() not supported')
      return
    }
    const stream = canvas.captureStream(60)
    const video = document.createElement('video')
    video.style.display = 'none'
    document.body.appendChild(video)
    video.srcObject = stream
    let emu = document.querySelector("#canvas")
    let menu = document.querySelector("#emulator-desktop-menu")
    const disableEmulationButtons = () => {
      const emuButtons = document.querySelectorAll('span[data-emu-button="true"]')
      emuButtons.forEach(button => {
        button.style.pointerEvents = 'none'
        button.style.opacity = '0.5'
        button.setAttribute('data-pip-disabled', 'true')
      })
    }
    const restoreEmulationButtons = () => {
      const emuButtons = document.querySelectorAll('span[data-pip-disabled="true"]')
      emuButtons.forEach(button => {
        button.style.pointerEvents = ''
        button.style.opacity = ''
        button.removeAttribute('data-pip-disabled')
      })
    }
    video.addEventListener('enterpictureinpicture', () => {
      if (emu) emu.style.display = 'none'
      if (menu) menu.style.display = 'none'
      disableEmulationButtons()
    })
    video.addEventListener('leavepictureinpicture', () => {
      if (emu) emu.style.display = 'block'
      if (menu) menu.style.display = 'flex'
      restoreEmulationButtons()
    })
    video.play().then(() => {
      video.requestPictureInPicture().catch(error => {
        console.error('PiP Error:', error)
      })
    })
  },
  setupMenuAutoHide() {
    document.addEventListener('mousemove', () => {
      this.showMenu()
      if (this.menuTimeout) {
        clearTimeout(this.menuTimeout)
      }
      this.menuTimeout = setTimeout(() => {
        this.hideMenu()
      }, this.menuHideDelay)
    })
    document.addEventListener('keydown', () => {
      this.showMenu()
      if (this.menuTimeout) {
        clearTimeout(this.menuTimeout)
      }
      this.menuTimeout = setTimeout(() => {
        this.hideMenu()
      }, this.menuHideDelay)
    })
  },
  hideMenu() {
    const menuEl = document.getElementById('emulator-desktop-menu')
    if (menuEl) {
      menuEl.style.opacity = '0'
      menuEl.style.transform = 'translateY(-48px)'
      this.menuVisible = false
    }
  },
  showMenu() {
    const menuEl = document.getElementById('emulator-desktop-menu')
    if (menuEl) {
      menuEl.style.opacity = '1'
      menuEl.style.transform = 'translateY(0)'
      this.menuVisible = true
    }
  },
  simulateKeydown(key, code, keyCode) {
    let event = new KeyboardEvent('keydown', {
      key: key,
      code: code,
      keyCode: keyCode,
      charCode: keyCode,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)
  },
  simulateKeyup(key, code, keyCode) {
    let event = new KeyboardEvent('keyup', {
      key: key,
      code: code,
      keyCode: keyCode,
      charCode: keyCode,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)
  },
  simulateKeypress(key, code, keyCode) {
    this.simulateKeydown(key, code, keyCode)
    setTimeout(() => {
      this.simulateKeyup(key, code, keyCode)
    }, 50)
  },
  showInfoOverlay() {
    if (document.getElementById('emulator-info-overlay')) {
      return
    }
    const menuItems = document.querySelectorAll('#emulator-desktop-menu .emulator-desktop-menu-item')
    menuItems.forEach(item => {
      item.style.pointerEvents = 'none'
      item.style.opacity = '0.5'
    })
    const overlay = document.createElement('div')
    overlay.id = 'emulator-info-overlay'
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    overlay.style.zIndex = '1000'
    overlay.style.display = 'flex'
    overlay.style.justifyContent = 'center'
    overlay.style.alignItems = 'center'
    const modalContent = document.createElement('div')
    modalContent.style.backgroundColor = 'rgba(20, 20, 20, 0.85)'
    modalContent.style.backdropFilter = 'blur(10px)'
    modalContent.style.webkitBackdropFilter = 'blur(10px)'
    modalContent.style.padding = '25px'
    modalContent.style.borderRadius = '12px'
    modalContent.style.color = 'white'
    modalContent.style.maxWidth = '360px'
    modalContent.style.position = 'relative'
    modalContent.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)'
    modalContent.style.border = '1px solid rgba(80, 80, 80, 0.2)'
    const content = `
      <div style="text-align: center; font-family: 'Helvetica Neue', 'Segoe UI', Helvetica, Arial, sans-serif;">
        <h4 style="margin: 10px 0; color: #007bff; font-size: 18px;">Emulator Atari 8-bit</h4>
        <div style="margin: 15px 0; line-height: 1.5;">
          <p style="margin: 8px 0;"><span style="color: #9e9e9e;">Rdzeń emulatora:</span> atari800-libretro</p>
          <p style="margin: 8px 0;"><span style="color: #9e9e9e;">Frontend:</span> AtariOnline</p>
          <p style="margin: 8px 0;"><span style="color: #9e9e9e;">Silnik:</span> Nostalgist.js</p>
        </div>
        <h4 style="margin: 15px 0 10px; color: #007bff; font-size: 16px;">Licencja</h4>
        <p style="margin-bottom: 20px;">MIT</p>
        <button style="background: #007bff; border: none; padding: 10px 20px; color: white; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background-color 0.2s ease;">Zamknij</button>
      </div>
    `
    modalContent.innerHTML = content
    overlay.appendChild(modalContent)
    const closeBtn = modalContent.querySelector('button')
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay)
      menuItems.forEach(item => {
        item.style.pointerEvents = ''
        item.style.opacity = ''
      })
    })
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay)
        menuItems.forEach(item => {
          item.style.pointerEvents = ''
          item.style.opacity = ''
        })
      }
    })
    document.body.appendChild(overlay)
    document.body.style.overflow = 'hidden'
    const restoreScrolling = () => {
      document.body.style.overflow = ''
    }
    closeBtn.addEventListener('click', restoreScrolling)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        restoreScrolling()
      }
    })
  },
  createModeSelector() {
    const container = document.createElement('div')
    container.classList.add('emulator-desktop-menu-item')
    const label = document.createElement('span')
    label.style.marginRight = '8px'
    container.appendChild(label)
    const select = document.createElement('select')
    select.style.color = 'grey'
    select.style.border = '1px solid grey'
    select.style.borderRadius = '4px'
    select.style.padding = '2px 4px'
    select.style.background = 'transparent'
    select.style.outline = 'none'
    select.style.boxShadow = 'none'
    const options = ['Joystick - kursory, Fire - Z', 'Tylko klawiatura']
    options.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt
      option.textContent = opt
      select.appendChild(option)
    })
    select.addEventListener('change', (e) => {
      this.keyboardMode = e.target.value
      if (this.gameFocusManager) {
        if (this.keyboardMode === 'Tylko klawiatura') {
          this.gameFocusManager.enable()
        } else {
          this.gameFocusManager.disable()
        }
      }
    })
    container.appendChild(select)
    return container
  },
  async fetchBinaryFile(url, root) {
    if (root != undefined) {
      url = root + url
    }
    url = `${url}`
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Error downloading file.')
        }
        return response.blob()
      })
      .then(blob => {
        return blob
      })
      .catch(error => {
        console.error('Error downloading file:', error)
      })
  },
  createKeyboardEvent(type, code) {
    return new KeyboardEvent(type, {
      key: code,
      code: code,
      which: 115,
      keyCode: 115,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      bubbles: true,
      cancelable: true
    })
  },
  async emulate(href, data, settings) {
    let controllerOverrrides = {}
    let isTouchJoy = settings.mode == 'touch'

    switch (settings.mode) {
      case 'touch':
        controllerOverrrides = {
          input_player1_up: 'F13',
          input_player1_left: 'F14',
          input_player1_down: 'F15',
          input_player1_right: 'F11',
          input_player1_b: 'kp_minus'
        }
        break
      case 'gamepad':
        controllerOverrrides = {
          input_player1_up: 'nul',
          input_player1_left: 'nul',
          input_player1_down: 'nul',
          input_player1_right: 'nul',
          input_player1_b: 'nul',
          input_player1_a: 'nul',
          input_player1_c: 'nul'
        }
        break
      case 'keyboard':
      default:
        break
    }

    let self = this
    const fileName = this.extractFileName(href)
    const guessedBios = this.guessBIOS(fileName)
    this.currentRomName = href.split('/').pop()
    let biosFiles = []
    for (let biosName of guessedBios) {
      let biosContent = await this.fetchBinaryFile(biosName, '/v01/emulator/')
      biosFiles.push({ fileName: biosName, fileContent: biosContent })
    }
    let romBlob = await this.fetchBinaryFile(href)
    let core = 'atari800'
    try {
      if (this.nostalgist != undefined) {
        await this.nostalgist.exit()
      }
      this.nostalgist = await nostalgistModule.launch({
        core: core,
        bios: biosFiles,
        rom: {
          fileName: fileName,
          fileContent: romBlob
        },
        retroarchConfig: {
          input_pause_toggle: false,
          video_scale_integer: true,
          force_scale: true,
          video_smooth: false,
          ...controllerOverrrides
        },
        retroarchCoreConfig: settings,
        resolveCoreJs(core) {
          return `${baseUrl}/${core}_libretro.js`
        },
        resolveCoreWasm(core) {
          return `${baseUrl}/${core}_libretro.wasm`
        },
        resolveRom(file) {
          file = encodeURIComponent(file)
          return file
        }
      })
      this.gameFocusManager = GameFocusManager.initialize(this.nostalgist, false)
      window.addEventListener('resize', () => {
        if (this.nostalgist == undefined) return
        this.nostalgist.resize({ width: window.innerWidth, height: window.innerHeight })
      })
    } catch (error) {
      console.error('Error launching emulator:', error)
    }
    if (isMobile()) {
      let mobileNav = document.getElementById('emulator-mobile-menu')
      if (!mobileNav) {
        mobileNav = document.createElement('div')
        mobileNav.id = 'emulator-mobile-menu'
        mobileNav.style.width = '100%'
        mobileNav.style.height = '48px'
        mobileNav.style.backgroundColor = 'rgba(0,0,0,1)'
        mobileNav.style.color = 'grey'
        mobileNav.style.position = 'fixed'
        mobileNav.style.top = '0'
        mobileNav.style.left = '0'
        mobileNav.style.display = 'flex'
        mobileNav.style.justifyContent = 'space-between'
        mobileNav.style.alignItems = 'center'
        mobileNav.style.zIndex = '9999'
        mobileNav.style.fontFamily = "'Helvetica Neue', 'Segoe UI', Helvetica, Arial, sans-serif"

        const leftContainer = document.createElement('div')
        leftContainer.style.marginLeft = '16px'

        const backBtnListener = new SingleTouchButtonCallbackListener(() => {
          if (this.quickShot) {
            this.quickShot.hide()
            this.quickShot = null
          }
          if (this.nostalgist) {
            this.nostalgist.exit()
          }

          document.getElementById('canvas')?.remove()
          document.getElementById('emulator-mobile-menu')?.remove()
          document.getElementById('mobile-maximize-container')?.remove()

          const bg = document.getElementById('emulator-mobile-background')
          if (bg) bg.remove()

          document.body.style.overflow = ''
          document.documentElement.style.overflow = ''
          document.body.style.pointerEvents = 'auto'

          const disabled = document.querySelectorAll('[data-pip-disabled="true"]')
          disabled.forEach(btn => {
            btn.style.pointerEvents = ''
            btn.style.opacity = ''
            btn.removeAttribute('data-pip-disabled')
          })
        })

        const backBtn = new SingleTouchButton(
          leftContainer,
          '◁ Wstecz',
          null,
          'mobile-back-button',
          backBtnListener,
          '8px'
        )

        backBtn.el.style.cursor = 'pointer'
        backBtn.el.style.width = '80px'
        backBtn.el.style.height = '28px'
        backBtn.el.style.display = 'flex'
        backBtn.el.style.alignItems = 'center'
        backBtn.el.style.justifyContent = 'center'

        const rightContainer = document.createElement('div')
        rightContainer.style.display = 'flex'
        rightContainer.style.flexDirection = 'row'
        rightContainer.style.gap = '8px'
        rightContainer.style.marginRight = '16px'
        rightContainer.style.height = '48px'
        rightContainer.style.alignItems = 'center'

        const startBtnListener = new SingleTouchButtonCallbackListener(() => {
          this.simulateKeypress('F4', 'F4', 115)
        })

        const startBtn = new SingleTouchButton(
          rightContainer,
          'START',
          null,
          'mobile-start-button',
          startBtnListener,
          '8px'
        )

        startBtn.el.style.cursor = 'pointer'
        startBtn.el.style.width = '80px'
        startBtn.el.style.height = '28px'
        startBtn.el.style.display = 'flex'
        startBtn.el.style.alignItems = 'center'
        startBtn.el.style.justifyContent = 'center'

        const selectBtnListener = new SingleTouchButtonCallbackListener(() => {
          this.nostalgist.press('select')
        })

        const selectBtn = new SingleTouchButton(
          rightContainer,
          'SELECT',
          null,
          'mobile-select-button',
          selectBtnListener,
          '8px'
        )

        selectBtn.el.style.cursor = 'pointer'
        selectBtn.el.style.width = '80px'
        selectBtn.el.style.height = '28px'
        selectBtn.el.style.display = 'flex'
        selectBtn.el.style.alignItems = 'center'
        selectBtn.el.style.justifyContent = 'center'

        mobileNav.appendChild(leftContainer)
        mobileNav.appendChild(rightContainer)

        document.body.appendChild(mobileNav)

      } else {
        mobileNav.style.display = 'flex'
      }
    } else {
      if (!this.menuCreated) {
        let menuEl = document.getElementById('emulator-desktop-menu')
        if (menuEl == undefined) {
          menuEl = document.createElement('div')
          menuEl.id = 'emulator-desktop-menu'
          menuEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
          menuEl.style.opacity = '1'
          let closeBtn = document.createElement('div')
          closeBtn.classList.add('emulator-desktop-menu-item')
          closeBtn.innerHTML = 'Zakończ'
          let pipBtn = document.createElement('div')
          pipBtn.classList.add('emulator-desktop-menu-item')
          pipBtn.innerHTML = 'Minimalizuj'
          let helpBtn = document.createElement('div')
          helpBtn.classList.add('emulator-desktop-menu-item')
          helpBtn.innerHTML = 'HELP'
          let startBtn = document.createElement('div')
          startBtn.classList.add('emulator-desktop-menu-item')
          startBtn.innerHTML = 'START'
          let selectBtn = document.createElement('div')
          selectBtn.classList.add('emulator-desktop-menu-item')
          selectBtn.innerHTML = 'SELECT'
          let optionBtn = document.createElement('div')
          optionBtn.classList.add('emulator-desktop-menu-item')
          optionBtn.innerHTML = 'OPTION'
          let resetBtn = document.createElement('div')
          resetBtn.classList.add('emulator-desktop-menu-item')
          resetBtn.innerHTML = 'RESET'
          let infoBtn = document.createElement('div')
          infoBtn.classList.add('emulator-desktop-menu-item')
          infoBtn.innerHTML = 'Info'
          let flexSpacer = document.createElement('div')
          flexSpacer.classList.add('emulator-desktop-menu-flex-spacer')
          let modeSelector = this.createModeSelector()
          menuEl.appendChild(helpBtn)
          menuEl.appendChild(startBtn)
          menuEl.appendChild(selectBtn)
          menuEl.appendChild(optionBtn)
          menuEl.appendChild(resetBtn)
          menuEl.appendChild(flexSpacer)
          menuEl.appendChild(modeSelector)
          menuEl.appendChild(infoBtn)
          this.menuTimeout = setTimeout(() => {
            this.hideMenu()
          }, this.menuHideDelay)
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
          const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1
          if ('requestPictureInPicture' in HTMLVideoElement.prototype && !isSafari && !isFirefox) {
            menuEl.appendChild(pipBtn)
          }
          menuEl.appendChild(closeBtn)
          document.body.appendChild(menuEl)
          closeBtn.addEventListener('click', () => {
            self.nostalgist.exit()
            document.getElementById("canvas")?.remove()
            document.getElementById("emulator-desktop-menu")?.remove()
            const emuButtons = document.querySelectorAll('span[data-pip-disabled="true"]')
            emuButtons.forEach(button => {
              button.style.pointerEvents = ''
              button.style.opacity = ''
              button.removeAttribute('data-pip-disabled')
            })
          })
          pipBtn.addEventListener('click', () => {
            self.enableWebGLPiP(this.nostalgist.getCanvas())
          })
          startBtn.addEventListener('click', () => {
            this.simulateKeypress('F4', 'F4', 115)
          })
          selectBtn.addEventListener('click', () => {
            this.nostalgist.press('select')
          })
          optionBtn.addEventListener('click', () => {
            this.simulateKeypress('F2', 'F2', 113)
          })
          resetBtn.addEventListener('click', () => {
            this.nostalgist.sendCommand('RESET')
          })
          infoBtn.addEventListener('click', () => {
            this.showInfoOverlay()
          })
        } else {
          menuEl.style.display = 'flex'
          menuEl.style.opacity = '1'
          menuEl.style.transform = 'translateY(0)'
        }
      }
    }
    if (isMobile() && this.nostalgist && isTouchJoy) {
      this.quickShot = new QuickShot(this.nostalgist)
      this.quickShot.show()
    }
  },
  applyStylesToElement(element, styles) {
    Object.assign(element.style, styles)
  },
  stylesConfig: [
    {
      selector: '#emulator-desktop-menu',
      styles: {
        backgroundColor: 'rgba(0, 0, 0, 1)',
        color: 'grey',
        position: 'fixed',
        width: '100%',
        height: '48px',
        zIndex: '9999',
        display: 'flex',
        alignItems: 'center',
        top: '0',
        left: '0',
        fontSize: '14px',
        fontFamily: "'Helvetica Neue', 'Segoe UI', Helvetica, Arial, sans-serif",
        padding: '16px',
        boxSizing: 'border-box',
        transition: 'opacity 0.3s ease, transform 0.3s ease'
      }
    },
    {
      selector: '.emulator-desktop-menu-label, .emulator-desktop-menu-item',
      styles: {
        margin: '16px',
        background: 'none',
        color: 'grey',
        fontFamily: "'Helvetica Neue', 'Segoe UI', Helvetica, Arial, sans-serif"
      }
    },
    {
      selector: '.emulator-desktop-menu-label',
      styles: {
        marginRight: '0px'
      }
    },
    {
      selector: '.emulator-desktop-menu-item',
      styles: {
        transition: 'color 0.3s ease',
        cursor: 'pointer'
      }
    },
    {
      selector: '.emulator-desktop-menu-flex-spacer',
      styles: {
        flexGrow: '1'
      }
    },
    {
      selector: '.emulator-desktop-menu-item:hover',
      styles: {
        color: 'white'
      }
    }
  ],
  applyStyles() {
    this.stylesConfig.forEach(({ selector, styles }) => {
      document.querySelectorAll(selector).forEach(element => {
        this.applyStylesToElement(element, styles)
      })
    })
    const menuEl = document.getElementById('emulator-desktop-menu')
    if (menuEl) {
      menuEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
    }
  },
  observeNewElements() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            this.stylesConfig.forEach(({ selector, styles }) => {
              if (node.matches(selector) || node.querySelector(selector)) {
                this.applyStylesToElement(node, styles)
                node.querySelectorAll(selector).forEach(child => {
                  this.applyStylesToElement(child, styles)
                })
              }
            })
          }
        })
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
  ,
  setupMobileOptimizations() {
    if (!isMobile()) return

    let emulatorActive = false

    function setupFullScreenOverlay() {
      if (!emulatorActive) return

      const canvas = document.getElementById('canvas')
      if (!canvas) return

      canvas.style.position = 'fixed'
      canvas.style.top = '0'
      canvas.style.left = '0'
      canvas.style.width = '100vw'
      canvas.style.height = '100vh'
      canvas.style.maxWidth = '100%'
      canvas.style.maxHeight = '100%'
      canvas.style.margin = '0'
      canvas.style.padding = '0'
      canvas.style.objectFit = 'contain'
      canvas.style.backgroundColor = '#000'
      canvas.style.zIndex = '9998'

      if (emulatorActive) {
        document.documentElement.style.margin = '0'
        document.documentElement.style.padding = '0'
        document.documentElement.style.overflow = 'hidden'
        document.body.style.margin = '0'
        document.body.style.padding = '0'
        document.body.style.overflow = 'hidden'
      }

      let background = document.getElementById('emulator-mobile-background')
      if (!background && emulatorActive) {
        background = document.createElement('div')
        background.id = 'emulator-mobile-background'
        background.style.position = 'fixed'
        background.style.top = '-10px'
        background.style.left = '-10px'
        background.style.width = 'calc(100vw + 20px)'
        background.style.height = 'calc(100vh + 20px)'
        background.style.backgroundColor = '#000'
        background.style.zIndex = '9997'
        document.body.appendChild(background)
      }

      const mobileMenu = document.getElementById('emulator-mobile-menu')
      if (mobileMenu) {
        mobileMenu.style.zIndex = '9999'
      }
    }

    function disableTouchGestures() {
      if (!emulatorActive) return

      const touchmoveHandler = function (event) {
        const element = event.target
        if (element.id === 'canvas' ||
          element.id === 'emulator-mobile-background' ||
          element.closest('#emulator-mobile-menu')) {
          event.preventDefault()
        }
      }

      const touchstartHandler = function (event) {
        if (event.touches.length > 1) {
          event.preventDefault()
        }
      }

      const touchendHandler = function (event) {
        const now = Date.now()
        const DOUBLE_TAP_THRESHOLD = 300

        if (typeof window.lastTouchEnd === 'number') {
          if (now - window.lastTouchEnd < DOUBLE_TAP_THRESHOLD) {
            event.preventDefault()
          }
        }

        window.lastTouchEnd = now
      }

      if (emulatorActive) {
        document.addEventListener('touchmove', touchmoveHandler, { passive: false })
        document.addEventListener('touchstart', touchstartHandler, { passive: false })
        document.addEventListener('touchend', touchendHandler, { passive: false })

        window.emulatorTouchHandlers = {
          move: touchmoveHandler,
          start: touchstartHandler,
          end: touchendHandler
        }
      } else if (window.emulatorTouchHandlers) {
        document.removeEventListener('touchmove', window.emulatorTouchHandlers.move)
        document.removeEventListener('touchstart', window.emulatorTouchHandlers.start)
        document.removeEventListener('touchend', window.emulatorTouchHandlers.end)
        window.emulatorTouchHandlers = null
      }

      let viewport = document.querySelector('meta[name="viewport"]')
      if (!viewport) {
        viewport = document.createElement('meta')
        viewport.name = 'viewport'
        document.head.appendChild(viewport)
      }

      if (!window.originalViewport) {
        window.originalViewport = viewport.content
      }

      if (emulatorActive) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      } else {
        if (window.originalViewport) {
          viewport.content = window.originalViewport
        }
      }

      const styleId = 'emulator-mobile-styles'
      let styleElement = document.getElementById(styleId)

      if (emulatorActive && !styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        styleElement.textContent = `
        #canvas, #emulator-mobile-background, #emulator-mobile-menu {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          touch-action: none;
          overscroll-behavior: none;
        }
      `
        document.head.appendChild(styleElement)
      } else if (!emulatorActive && styleElement) {
        styleElement.remove()
      }
    }

    function hideBrowserChrome() {
      if (!emulatorActive) return

      function hideAddressBar() {
        if (!emulatorActive) return

        if (document.documentElement.scrollHeight > window.innerHeight) {
          setTimeout(function () {
            window.scrollTo(0, 1)
          }, 0)
        } else {
          const originalHeight = document.body.style.height
          document.body.style.height = (window.innerHeight + 50) + 'px'
          setTimeout(function () {
            window.scrollTo(0, 1)
            if (emulatorActive) {
              document.body.style.height = window.innerHeight + 'px'
            } else {
              document.body.style.height = originalHeight
            }
          }, 0)
        }
      }

      if (emulatorActive) {
        hideAddressBar()
      }

      function requestFullScreen() {
        return //todo
        if (!emulatorActive) return

        const canvas = document.getElementById('canvas')
        if (!canvas) return

        if (document.fullscreenEnabled) {
          canvas.requestFullscreen().catch(err => {
            console.warn('Fullscreen request failed:', err)
          })
        } else if (document.webkitFullscreenEnabled) {
          canvas.webkitRequestFullscreen().catch(err => {
            console.warn('Webkit fullscreen request failed:', err)
          })
        }
      }

      if (emulatorActive) {
        document.addEventListener('touchstart', requestFullScreen, { once: true })
      }
    }

    function handleResize() {
      if (!emulatorActive) return

      setupFullScreenOverlay()

      setTimeout(function () {
        if (emulatorActive) {
          window.scrollTo(0, 1)
        }
      }, 100)
    }

    function activateOptimizations() {
      emulatorActive = true
      setupFullScreenOverlay()
      disableTouchGestures()
      hideBrowserChrome()

      window.addEventListener('resize', handleResize)
      window.addEventListener('orientationchange', handleResize)
    }

    function deactivateOptimizations() {
      emulatorActive = false

      const background = document.getElementById('emulator-mobile-background')
      if (background) {
        background.remove()
      }

      const initialOverlay = document.getElementById('emulator-initial-overlay')
      if (initialOverlay) {
        initialOverlay.remove()
      }

      document.documentElement.style.overflow = ''
      document.documentElement.style.margin = ''
      document.documentElement.style.padding = ''
      document.body.style.overflow = ''
      document.body.style.margin = ''
      document.body.style.padding = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''

      disableTouchGestures()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)

      let viewport = document.querySelector('meta[name="viewport"]')
      if (viewport && window.originalViewport) {
        viewport.content = window.originalViewport
      }
    }

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.id === 'canvas') {
            activateOptimizations()
          }
        })

        mutation.removedNodes.forEach(function (node) {
          if (node.id === 'canvas') {
            deactivateOptimizations()
          }
        })
      })
    })

    observer.observe(document.body, { childList: true })

    return {
      activate: activateOptimizations,
      deactivate: deactivateOptimizations,
      cleanup: function () {
        deactivateOptimizations()
        observer.disconnect()
      }
    }
  }
}
export default Emulator