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
  init() {
    this.applyStyles()
    this.observeNewElements()
    this.loadNostalgist()
    this.checkLinks()
    if (!isMobile()) {
      this.setupMenuAutoHide()
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
    const validExtensions = ['.xex', '.atr', '.cas', '.bin', '.car']
    const validPlatforms = ['a8']
    const href = link.getAttribute('href')
    if (validExtensions.some(ext => href.endsWith(ext))) return true
    return validPlatforms.includes(link.dataset.emulation)
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
        () => {},
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
      padding: 8px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    `
    const header = document.createElement('div')
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    `
    const title = document.createElement('h2')
    title.textContent = 'Uruchom emulację'
    title.style.cssText = `
      margin: 0;
      font-size: 1.5em;
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
    const createSelectGroup = (labelText, name, options, defaultValue) => {
      const group = document.createElement('div')
      group.style.marginBottom = '15px'
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
    form.appendChild(createSelectGroup('BASIC', 'atari800_internalbasic', [
      ['disabled', 'Nie'],
      ['enabled', 'Tak']
    ], defaultConfig.atari800_internalbasic))
    form.appendChild(createSelectGroup('System TV', 'atari800_ntscpal', [
      ['PAL', 'PAL'],
      ['NTSC', 'NTSC']
    ], defaultConfig.atari800_ntscpal))
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
      margin-top: 20px;
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
    let self = this
    const fileName = this.extractFileName(href)
    const guessedBios = this.guessBIOS(fileName)
    this.currentRomName = href.split('/').pop()
    let biosFiles = []
    for (let biosName of guessedBios) {
      let biosContent = await this.fetchBinaryFile(biosName, 'emulator/')
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
          video_smooth: false
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
        mobileNav.style.alignItems = 'center'
        mobileNav.style.zIndex = '9999'
        mobileNav.style.fontFamily = "'Helvetica Neue', 'Segoe UI', Helvetica, Arial, sans-serif"
        let backBtn = document.createElement('div')
        backBtn.style.cursor = 'pointer'
        backBtn.style.marginLeft = '16px'
        backBtn.innerHTML = '&lt; Wstecz'
        backBtn.addEventListener('touchstart', () => {
          if (self.nostalgist) {
            self.nostalgist.exit()
          }
          document.getElementById("canvas")?.remove()
          document.getElementById("emulator-mobile-menu")?.remove()
          const emuButtons = document.querySelectorAll('span[data-pip-disabled="true"]')
          emuButtons.forEach(button => {
            button.style.pointerEvents = ''
            button.style.opacity = ''
            button.removeAttribute('data-pip-disabled')
          })
        })
        mobileNav.appendChild(backBtn)
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
}
export default Emulator