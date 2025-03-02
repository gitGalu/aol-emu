const QJ_LABEL_COLOR = 'rgba(136, 136, 136, 0.533)'
const QJ_IDLE_COLOR = 'rgba(70,70,70,0.7)'
const QJ_ACTIVE_COLOR = 'rgba(0,123,255,0.8)'

class TouchButtonListener {
    trigger(isPressed) {
    }
}

class SingleTouchButtonCallbackListener extends TouchButtonListener {
    constructor(onPressed) {
        super()
        this.onPressed = onPressed
    }
    trigger(pressed) {
        if (pressed && this.onPressed) {
            this.onPressed()
        }
    }
}

class SingleTouchButtonJoyListener extends TouchButtonListener {
    constructor(nostalgist, inputName) {
        super()
        this.nostalgist = nostalgist
        this.inputName = inputName
    }
    trigger(isPressed) {
        if (isPressed) {
            this.nostalgist.pressDown(this.inputName)
        } else {
            this.nostalgist.pressUp(this.inputName)
        }
    }
}

class SingleTouchButton {
    constructor(parent, label, gridArea, id, elListener, radius = '12px') {
        this.elListener = elListener
        this.activeTouchId = null
        this.isPressed = false

        this.el = this.#createContainer(label, gridArea, id, radius)
        parent.appendChild(this.el)

        this.el.style.background = QJ_IDLE_COLOR
        this.el.style.color = QJ_LABEL_COLOR
        this.el.style.touchAction = 'none'
        this.el.style.userSelect = 'none'
        this.el.style.webkitUserSelect = 'none'

        this.el.addEventListener('touchstart', this.onTouchStart, { passive: false })
    }

    onTouchStart = (e) => {
        e.preventDefault()
        if (this.activeTouchId === null && e.changedTouches.length > 0) {
            const t = e.changedTouches[0]
            this.activeTouchId = t.identifier
            this.setPressed(true)

            document.addEventListener('touchmove', this.onTouchMove, { passive: false })
            document.addEventListener('touchend', this.onTouchEnd, { passive: false })
            document.addEventListener('touchcancel', this.onTouchEnd, { passive: false })
        }
    }

    onTouchMove = (e) => {
        e.preventDefault()
    }

    onTouchEnd = (e) => {
        e.preventDefault()
        for (let changed of e.changedTouches) {
            if (changed.identifier === this.activeTouchId) {
                this.setPressed(false)
                this.activeTouchId = null

                document.removeEventListener('touchmove', this.onTouchMove)
                document.removeEventListener('touchend', this.onTouchEnd)
                document.removeEventListener('touchcancel', this.onTouchEnd)
                break
            }
        }
    }

    setPressed(newState) {
        if (newState !== this.isPressed) {
            this.isPressed = newState
            this.el.style.background = newState ? QJ_ACTIVE_COLOR : QJ_IDLE_COLOR
            this.elListener.trigger(newState)
        }
    }

    #createContainer(label, gridArea, id, radius) {
        const div = document.createElement('div')
        div.classList.add('fast-button')
        if (label) div.textContent = label
        if (gridArea) div.style.gridArea = gridArea
        if (id) div.id = id

        div.style.borderRadius = radius
        div.style.display = 'flex'
        div.style.alignItems = 'center'
        div.style.justifyContent = 'center'
        div.style.pointerEvents = 'auto'
        return div
    }
}

class QuickShot {
    constructor(nostalgist) {
        this.nostalgist = nostalgist

        this.joystickActiveId = null
        this.joystickBase = null
        this.joystickThumb = null
        this.activeDirections = new Set()

        this.createJoystickArea()
        this.createFireButton()

        this.orientationHandler = this.handleOrientationChange.bind(this)
        window.addEventListener('orientationchange', this.orientationHandler)
        window.addEventListener('resize', this.orientationHandler)
    }

    createJoystickArea() {
        this.joystickArea = document.createElement('div')
        this.joystickArea.id = 'mobile-joystick-area'
        this.joystickArea.style.position = 'fixed'
        this.joystickArea.style.left = '0'
        this.joystickArea.style.top = '48px'
        this.joystickArea.style.width = '100%'
        this.joystickArea.style.height = 'calc(100% - 48px)'
        this.joystickArea.style.zIndex = '99998'
        this.joystickArea.style.background = 'transparent'
        this.joystickArea.style.display = 'none'
        this.joystickArea.style.touchAction = 'none'
        this.joystickArea.style.userSelect = 'none'
        this.joystickArea.style.pointerEvents = 'auto'


        this.joystickArea.addEventListener('touchstart', this.handleJoystickStart, { passive: false })

        document.body.appendChild(this.joystickArea)
    }

    createFireButton() {
        const fireBtnListener = new SingleTouchButtonJoyListener(this.nostalgist, 'b')
        this.fireButton = new SingleTouchButton(
            document.body,
            'FIRE',
            null,
            'mobile-fire-button',
            fireBtnListener,
            '50%'
        )

        const fireEl = this.fireButton.el
        fireEl.style.position = 'fixed'
        fireEl.style.bottom = '30px'
        fireEl.style.right = '30px'
        fireEl.style.width = '100px'
        fireEl.style.height = '100px'
        fireEl.style.borderRadius = '50%'
        fireEl.style.fontWeight = 'bold'
        fireEl.style.display = 'none'
        fireEl.style.zIndex = '99999'
        fireEl.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)'
        fireEl.style.justifyContent = 'center'
        fireEl.style.alignItems = 'center'
    }

    show() {
        if (this.fireButton?.el) {
            this.fireButton.el.style.display = 'flex'
        }
        if (this.joystickArea) {
            this.joystickArea.style.display = 'block'
        }
    }

    hide() {
        if (this.fireButton?.el) {
            this.fireButton.el.style.display = 'none'
        }
        if (this.joystickArea) {
            this.joystickArea.style.display = 'none'
        }

        this.updateDirections([])
        if (this.joystickBase) {
            this.joystickBase.remove()
            this.joystickBase = null
        }
        if (this.joystickThumb) {
            this.joystickThumb.remove()
            this.joystickThumb = null
        }
        this.joystickActiveId = null

        window.removeEventListener('orientationchange', this.orientationHandler)
        window.removeEventListener('resize', this.orientationHandler)
    }

    handleOrientationChange() {
        this.updateDirections([])
        this.joystickActiveId = null

        if (this.joystickBase) {
            this.joystickBase.remove()
            this.joystickBase = null
        }
        if (this.joystickThumb) {
            this.joystickThumb.remove()
            this.joystickThumb = null
        }
        this.nostalgist.pressUp('b')
    }

    handleJoystickStart = (e) => {
        e.preventDefault()
        if (this.joystickActiveId === null && e.changedTouches.length > 0) {
            const t = e.changedTouches[0]
            this.joystickActiveId = t.identifier
            this.createJoystickVisuals(t)

            document.addEventListener('touchmove', this.handleJoystickMove, { passive: false })
            document.addEventListener('touchend', this.handleJoystickEnd, { passive: false })
            document.addEventListener('touchcancel', this.handleJoystickEnd, { passive: false })
        }
    }

    handleJoystickMove = (e) => {
        e.preventDefault()
        if (this.joystickActiveId === null) return

        let activeTouch = null
        for (const touch of e.touches) {
            if (touch.identifier === this.joystickActiveId) {
                activeTouch = touch
                break
            }
        }
        if (!activeTouch) return

        this.updateJoystickPosition(activeTouch)

        if (this.joystickBase && this.joystickThumb) {
            const baseRect = this.joystickBase.getBoundingClientRect()
            const cx = baseRect.left + baseRect.width / 2
            const cy = baseRect.top + baseRect.height / 2
            const dist = this.getDistance({ x: cx, y: cy }, {
                x: activeTouch.clientX,
                y: activeTouch.clientY
            })
            if (dist > 30) {
                const angle = Math.atan2(
                    activeTouch.clientY - cy,
                    activeTouch.clientX - cx
                )
                let deg = angle * (180 / Math.PI)
                if (deg < 0) deg += 360
                const dirs = this.getDirections(deg)
                this.updateDirections(dirs)
            } else {
                this.updateDirections([])
            }
        }
    }

    handleJoystickEnd = (e) => {
        e.preventDefault()
        for (let changed of e.changedTouches) {
            if (changed.identifier === this.joystickActiveId) {
                this.updateDirections([])
                if (this.joystickBase) {
                    this.joystickBase.remove()
                    this.joystickBase = null
                }
                if (this.joystickThumb) {
                    this.joystickThumb.remove()
                    this.joystickThumb = null
                }
                this.joystickActiveId = null

                document.removeEventListener('touchmove', this.handleJoystickMove)
                document.removeEventListener('touchend', this.handleJoystickEnd)
                document.removeEventListener('touchcancel', this.handleJoystickEnd)
                break
            }
        }
    }

    createJoystickVisuals(touch) {
        this.joystickBase = document.createElement('div')
        this.joystickBase.style.position = 'fixed'
        this.joystickBase.style.width = '100px'
        this.joystickBase.style.height = '100px'
        this.joystickBase.style.borderRadius = '50%'
        this.joystickBase.style.backgroundColor = 'rgba(100,100,100,0.5)'
        this.joystickBase.style.zIndex = '99999'
        this.joystickBase.style.left = (touch.clientX - 50) + 'px'
        this.joystickBase.style.top = (touch.clientY - 50) + 'px'

        this.joystickThumb = document.createElement('div')
        this.joystickThumb.style.position = 'fixed'
        this.joystickThumb.style.width = '50px'
        this.joystickThumb.style.height = '50px'
        this.joystickThumb.style.borderRadius = '50%'
        this.joystickThumb.style.backgroundColor = 'rgba(0,123,255,0.7)'
        this.joystickThumb.style.zIndex = '99999'
        this.joystickThumb.style.left = (touch.clientX - 25) + 'px'
        this.joystickThumb.style.top = (touch.clientY - 25) + 'px'

        document.body.appendChild(this.joystickBase)
        document.body.appendChild(this.joystickThumb)
    }

    updateJoystickPosition(touch) {
        if (!this.joystickBase || !this.joystickThumb) return
        const baseRect = this.joystickBase.getBoundingClientRect()
        const cx = baseRect.left + baseRect.width / 2
        const cy = baseRect.top + baseRect.height / 2
        const maxDist = baseRect.width / 2
        const dist = this.getDistance({ x: cx, y: cy }, { x: touch.clientX, y: touch.clientY })
        const angle = Math.atan2(touch.clientY - cy, touch.clientX - cx)

        this.joystickThumb.style.left = (touch.clientX - 25) + 'px'
        this.joystickThumb.style.top = (touch.clientY - 25) + 'px'

        if (dist > maxDist) {
            this.joystickBase.style.left = (touch.clientX - 50 - Math.cos(angle) * maxDist) + 'px'
            this.joystickBase.style.top = (touch.clientY - 50 - Math.sin(angle) * maxDist) + 'px'
        }
    }

    getDirections(deg) {
        if (deg >= 337.5 || deg < 22.5) {
            return ['right']
        } else if (deg >= 22.5 && deg < 67.5) {
            return ['right', 'down']
        } else if (deg >= 67.5 && deg < 112.5) {
            return ['down']
        } else if (deg >= 112.5 && deg < 157.5) {
            return ['down', 'left']
        } else if (deg >= 157.5 && deg < 202.5) {
            return ['left']
        } else if (deg >= 202.5 && deg < 247.5) {
            return ['left', 'up']
        } else if (deg >= 247.5 && deg < 292.5) {
            return ['up']
        } else {
            return ['up', 'right']
        }
    }

    updateDirections(newDirs) {
        const newSet = new Set(newDirs)
        for (const dir of this.activeDirections) {
            if (!newSet.has(dir)) {
                this.nostalgist.pressUp(dir)
                this.activeDirections.delete(dir)
            }
        }
        for (const dir of newSet) {
            if (!this.activeDirections.has(dir)) {
                this.nostalgist.pressDown(dir)
                this.activeDirections.add(dir)
            }
        }
    }

    getDistance(p1, p2) {
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        return Math.sqrt(dx * dx + dy * dy)
    }
}

export {
    QuickShot,
    SingleTouchButton,
    SingleTouchButtonJoyListener,
    SingleTouchButtonCallbackListener,
    TouchButtonListener
}