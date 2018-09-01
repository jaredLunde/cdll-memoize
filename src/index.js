import {strictShallowEqual} from '@render-props/utils'


export const shallowEqual = strictShallowEqual
const emptyObj = {}


export class Element {
  constructor (value, prev, next) {
    this.value = value
    this.next = next || this
    this.prev = prev || this
    this.next.prev = this
    this.prev.next = this
  }

  delete () {
    this.next.prev = this.prev
    this.prev.next = this.next
  }
}


function defaultFindIsEqual (a, b) {
  return a === b
}


/**
head -> next -> tail
head <- prev <- tail
**/
export class CDLL {
  constructor (initialValues) {
    this.head = null
    this.tail = null
    this.size = 0

    if (initialValues) {
      for (let i = 0; i < initialValues.length; i++) {
        this.push(initialValues[i])
      }
    }
  }

  forEach (cb) {
    let next = this.head.next
    cb(next.value)
    while (next !== this.head) {
      next = next.next
      if (cb(next.value) === false)
        break
    }
  }

  map (cb) {
    let i = 0
    let nextCDLL = new CDLL()

    this.forEach(v => {
      nextCDLL.push(cb(v), i)
      i += 1
    })

    return nextCDLL
  }

  find (value, isEqual = defaultFindIsEqual) {
    if (this.size === 0) {
      return
    }

    if (isEqual(this.head.value, value)) {
      return this.head
    }

    let next = this.head.next
    while (next !== this.head) {
      if (isEqual(next.value, value)) {
        return next
      }

      next = next.next
    }
  }

  findReverse (value, isEqual = defaultFindIsEqual) {
    if (this.size === 0) {
      return
    }

    if (isEqual(this.tail.value, value)) {
      return this.tail
    }

    let prev = this.tail.prev
    while (prev !== this.tail) {
      if (isEqual(prev.value, value)) {
        return prev
      }

      prev = prev.prev
    }
  }

  insertAfter (el, value) {
    const newEl = new Element(value, el, el.next)
    this.size++

    if (el === this.tail) {
      this.tail = newEl
    }
  }

  insertBefore (el, value) {
    const newEl = new Element(value, el.prev, el)
    this.size++

    if (el === this.head) {
      this.head = newEl
    }
  }

  push (value) {
    this.tail = new Element(value, this.tail, this.head)
    this.size++

    if (this.size === 1) {
      this.head = this.tail
    }
  }

  unshift (value) {
    this.head = new Element(value, this.tail, this.head)
    this.size++

    if (this.size === 1) {
      this.tail = this.head
    }
  }

  pop () {
    const tail = this.tail
    this.tail = tail.prev
    tail.delete()
    this.size--
    this._nullifyIfEmpty()

    return tail
  }

  shift () {
    const head = this.head
    this.head = head.next
    head.delete()
    this.size--
    this._nullifyIfEmpty()

    return head
  }

  delete (el) {
    el.delete()
    this.size--
    this._nullifyIfEmpty()

    if (el === this.tail) {
      this.tail = el.prev
    }

    if (el === this.head) {
      this.head = el.next
    }
  }

  clear () {
    this.size = 0
    this._nullifyIfEmpty()
  }

  _nullifyIfEmpty () {
    if (this.size === 0) {
      this.tail = null
      this.head = null
    }
  }
}


export default function memoize (fn, opt) {
  let {
    size = 24,
    isEqual = strictShallowEqual,
    serializer = null,
    debug = false
  } = opt || emptyObj
  let ll = new CDLL()

  function areArgsEqual (a, b) {
    return isEqual(a.args, b)
  }

  function wrapper (...args) {
    const serializedArgs = serializer ? serializer(args) : args

    if (ll.size === 0) {
      const result = fn(...args)
      ll.push({args: serializedArgs, result})

      if (__DEV__) {
        if (debug === true) {
          record('miss', fn, args)
        }
      }

      return result
    }
    else {
      let i = 1
      const element = ll.findReverse(serializedArgs, areArgsEqual)

      if (element !== void 0) {
        // this is a cache hit, return the result and move the element to
        // the TAIL of the list
        if (__DEV__) {
          if (debug === true) {
            record('hit', fn, args)
          }
        }
        ll.delete(element)
        ll.push(element.value)

        return element.value.result
      }

      if (__DEV__) {
        if (debug === true) {
          record('miss', fn, args)
        }
      }

      // this is a cache miss and the result is the next TAIL
      const result = fn(...args)
      ll.push({args: serializedArgs, result})

      if (i > ll.size) {
        // removes the HEAD
        ll.shift()
      }

      return result
    }
  }

  if (__DEV__) {
    Object.defineProperty(wrapper, 'name', {value: `memoize(${fn.name})`})
  }

  return wrapper
}


let MISSES = 0
let HITS = 0

function record (type, fn, args) {
  if (type === 'miss') {
    MISSES++
  }
  else {
    HITS++
  }

  console.log(type.toUpperCase(), fn.name, args, HITS / (HITS + MISSES))
}
