import {createWorker} from '@/utils/worker'

/**
 * 列表转树形结构
 * @param {Array} list
 * @param {Number|String} rootSign 根节点的pid值
 * @param {String} idKey
 * @param {String} pidKey
 * @param {String} childrenKey
 * @returns {Array}
 */
export function createTree(list, rootSign = 0, idKey = 'id', pidKey = 'pid', childrenKey = 'children') {
    if (!list || list.length <= 0) return []
    let info = {}
    list.forEach(i => {
        i[childrenKey] = []
        info[i[idKey]] = i
    })
    return list.filter(node => {
        info[node[pidKey]] && info[node[pidKey]][childrenKey].push(node)
        return node[pidKey] === rootSign
    })
}

/**
 * 完全树full，拿到某些带value的节点数组limit，获得裁剪后的树
 * 只用于裁剪客户和供应商的行政区域树
 * @param full
 * @param limit
 */
export function createLimitTree(full, limit) {
    const map = limit.reduce((m, n) => {
        m[n.id] = n.value
        return m
    }, {})
    full = JSON.parse(JSON.stringify(full))

    const result = shapeTree(full, node => {
        const value = map[node.id]
        if (value !== undefined) {
            node.value = value
            return true
        }
        return false
    })

    result.forEach(i => calc(i))

    return result
}

/**
 * createLimitTree的另一版本
 * @param fullMap 完全树的节点map
 * @param limit
 */
export function createLimitTreeByMap(fullMap, limit) {
    const resultNodes = {}

    //从该节点往上查找父节点
    function findParent(node) {
        //如果该节点已存在于结果集中，说明包含该节点的上级分支也全部存在，所以跳过
        if (resultNodes[node.id]) return

        //使用full中的数据，仅保留node的value
        const fullNode = fullMap[node.id]
        if (!fullNode) return
        resultNodes[fullNode.id] = {...node, ...fullNode}

        //查找父节点
        const parent = fullMap[fullNode.pid]
        if (!parent) return

        return findParent(parent)
    }

    for (const node of limit) {
        if (!fullMap[node.id]) continue
        findParent(node)
    }

    const result = createTree(Object.values(resultNodes), '0')

    result.forEach(i => calc(i))

    return result
}

/**
 * 根据判断函数裁剪树，当节点不满足predicate且无下级节点时将被裁剪
 * @param tree
 * @param predicate
 * @param childrenKey
 * @returns {*[]} 经过裁剪后的树
 */
export function shapeTree(tree = [], predicate = () => true, childrenKey = 'children') {
    return tree.filter(data => {
        data[childrenKey] = shapeTree(data[childrenKey], predicate)
        return predicate(data) || data[childrenKey].length
    })
}

export function calc(node, valueKey = 'value', childrenKey = 'children') {
    if (!node) return 0
    const children = node[childrenKey]
    const childValue = node[valueKey] || 0
    if (!children) return childValue
    const value = childValue + children.reduce((v, child) => v + calc(child), 0)
    node[valueKey] = value
    return value
}

/**
 * el-tree展开收缩
 * 有兴趣的可以研究下怎么平滑展开收缩
 * @param ref el-tree实例
 * @param action expand | collapse
 * @param level 展开的节点最大深度，为0时匹配全部节点
 */
export function elTreeControl(ref, action = 'expand', level = 1) {
    ref.store._getAllNodes().forEach(node => {
        let value = action === 'expand'
        node.expanded = level === 0 || node.level <= level ? value : !value
    })
}

export function getNodeId(arr) {
    if (!arr) return []
    let res = []
    arr.forEach(i => {
        res.push(i.id)
        if (i.children && i.children.length > 0) {
            res.push(...getNodeId(i.children))
        }
    })
    return res
}

export function getNodesByDfs(node) {
    let nodes = []
    let stack = []
    stack.push(node)
    while (stack.length > 0) {
        let item = stack.pop()
        nodes.push(item)
        let children = item.children
        for (let i = children.length - 1; i >= 0; i--) {
            stack.push(children[i])
        }
    }
    return nodes
}

export function getNodesByBfs(node) {
    let nodes = []
    let queue = []
    queue.unshift(node)
    while (queue.length > 0) {
        let item = queue.shift()
        nodes.push(item)
        queue.push(...item.children)
    }
    return nodes
}

//借助worker生成树
export function createTreeByWorker(list) {
    return new Promise(resolve => {
        let worker = createWorker(workerTree, list, ({data}) => {
            resolve(data)
            worker.terminate()
        })
    })
}

function workerTree() {
    function createTree(list, rootSign = 0, idKey = 'id', pidKey = 'pid', childrenKey = 'children') {
        if (!list || list.length <= 0) return []
        let info = {}
        list.forEach(i => {
            i[childrenKey] = []
            info[i[idKey]] = i
        })
        return list.filter(node => {
            info[node[pidKey]] && info[node[pidKey]][childrenKey].push(node)
            return node[pidKey] === rootSign
        })
    }

    self.addEventListener('message', ({data}) => {
        self.postMessage(createTree(data))
    })
}
