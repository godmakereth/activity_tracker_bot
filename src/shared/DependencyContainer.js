/**
 * 依賴注入容器
 * 管理應用程式的依賴關係和服務實例
 */

class DependencyContainer {
    constructor() {
        this.services = new Map();
        this.instances = new Map();
        this.isBooted = false;
    }

    /**
     * 註冊服務
     * @param {string} name 服務名稱
     * @param {Function} factory 工廠函數
     * @param {boolean} singleton 是否為單例
     * @param {Array<string>} dependencies 依賴列表
     */
    register(name, factory, singleton = false, dependencies = []) {
        if (this.services.has(name)) {
            throw new Error(`服務 ${name} 已經註冊`);
        }

        this.services.set(name, {
            factory,
            singleton,
            dependencies,
            instance: null
        });
    }

    /**
     * 註冊單例服務
     * @param {string} name 服務名稱
     * @param {Function} factory 工廠函數
     * @param {Array<string>} dependencies 依賴列表
     */
    singleton(name, factory, dependencies = []) {
        this.register(name, factory, true, dependencies);
    }

    /**
     * 註冊實例
     * @param {string} name 服務名稱
     * @param {*} instance 實例對象
     */
    instance(name, instance) {
        this.services.set(name, {
            factory: () => instance,
            singleton: true,
            dependencies: [],
            instance: instance
        });
        this.instances.set(name, instance);
    }

    /**
     * 獲取服務實例
     * @param {string} name 服務名稱
     * @returns {*} 服務實例
     */
    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`服務 ${name} 未註冊`);
        }

        // 如果是單例且已創建實例，直接返回
        if (service.singleton && service.instance) {
            return service.instance;
        }

        // 解析依賴
        const dependencies = service.dependencies.map(dep => this.get(dep));

        // 創建實例
        const instance = service.factory(...dependencies);

        // 如果是單例，保存實例
        if (service.singleton) {
            service.instance = instance;
            this.instances.set(name, instance);
        }

        return instance;
    }

    /**
     * 檢查服務是否已註冊
     * @param {string} name 服務名稱
     * @returns {boolean} 是否已註冊
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * 解除註冊服務
     * @param {string} name 服務名稱
     */
    unregister(name) {
        this.services.delete(name);
        this.instances.delete(name);
    }

    /**
     * 清除所有服務
     */
    clear() {
        this.services.clear();
        this.instances.clear();
        this.isBooted = false;
    }

    /**
     * 啟動容器，初始化所有單例服務
     */
    boot() {
        if (this.isBooted) {
            return;
        }

        // 按依賴順序初始化單例服務
        const singletonServices = Array.from(this.services.entries())
            .filter(([name, service]) => service.singleton);

        // 簡單的拓撲排序，確保依賴順序
        const sorted = this.topologicalSort(singletonServices);

        for (const [name] of sorted) {
            this.get(name); // 觸發實例創建
        }

        this.isBooted = true;
    }

    /**
     * 拓撲排序依賴
     * @param {Array} services 服務列表
     * @returns {Array} 排序後的服務列表
     */
    topologicalSort(services) {
        const graph = new Map();
        const inDegree = new Map();

        // 建立圖和入度計算
        for (const [name, service] of services) {
            graph.set(name, service.dependencies);
            inDegree.set(name, 0);
        }

        // 計算入度
        for (const [name, service] of services) {
            for (const dep of service.dependencies) {
                if (inDegree.has(dep)) {
                    inDegree.set(dep, inDegree.get(dep) + 1);
                }
            }
        }

        // Kahn 算法
        const queue = [];
        const result = [];

        for (const [name, degree] of inDegree) {
            if (degree === 0) {
                queue.push(name);
            }
        }

        while (queue.length > 0) {
            const current = queue.shift();
            result.push([current, this.services.get(current)]);

            const dependencies = graph.get(current) || [];
            for (const dep of dependencies) {
                if (inDegree.has(dep)) {
                    inDegree.set(dep, inDegree.get(dep) - 1);
                    if (inDegree.get(dep) === 0) {
                        queue.push(dep);
                    }
                }
            }
        }

        if (result.length !== services.length) {
            throw new Error('檢測到循環依賴');
        }

        return result;
    }

    /**
     * 獲取所有已註冊的服務名稱
     * @returns {Array<string>} 服務名稱列表
     */
    getRegisteredServices() {
        return Array.from(this.services.keys());
    }

    /**
     * 獲取容器狀態信息
     * @returns {Object} 狀態信息
     */
    getStatus() {
        return {
            isBooted: this.isBooted,
            totalServices: this.services.size,
            createdInstances: this.instances.size,
            services: Array.from(this.services.entries()).map(([name, service]) => ({
                name,
                singleton: service.singleton,
                dependencies: service.dependencies,
                hasInstance: !!service.instance
            }))
        };
    }

    /**
     * 創建子容器
     * @returns {DependencyContainer} 新的容器實例
     */
    createChild() {
        const child = new DependencyContainer();
        
        // 複製父容器的服務註冊
        for (const [name, service] of this.services) {
            child.services.set(name, { ...service, instance: null });
        }

        return child;
    }

    /**
     * 批量註冊服務
     * @param {Object} providers 服務提供者映射
     */
    registerProviders(providers) {
        for (const [name, config] of Object.entries(providers)) {
            if (typeof config === 'function') {
                this.register(name, config);
            } else {
                this.register(
                    name,
                    config.factory,
                    config.singleton || false,
                    config.dependencies || []
                );
            }
        }
    }
}

// 創建全局容器實例
const container = new DependencyContainer();

module.exports = { DependencyContainer, container };