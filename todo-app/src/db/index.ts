import { openDB, IDBPDatabase, deleteDB } from "idb";
import { v4 as uuid } from "uuid";

// 할 일 우선순위
export enum Priority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
}

// 반복 유형
export enum RepeatType {
    NONE = "none",
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly",
    CUSTOM = "custom",
}

// 반복 주기 설정
export interface RepeatConfig {
    type: RepeatType;
    interval?: number; // 반복 간격 (ex: 2주마다 = 2)
    daysOfWeek?: number[]; // 요일 (0-6, 일-토)
    endDate?: Date; // 반복 종료일
    occurrence?: number; // 반복 횟수
}

// 하위 할 일 (체크리스트 아이템)
export interface SubTask {
    id: string;
    text: string;
    completed: boolean;
}

// 메모 인터페이스
export interface TodoNote {
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

// 할 일
export interface Todo {
    id?: number;
    text: string;
    description?: string; // 상세 설명
    completed: boolean;
    createdAt: Date;
    dueDate?: Date; // 마감일
    startDate?: Date; // 시작일
    endDate?: Date; // 종료일 (기간이 있는 일정)
    tags: string[];
    priority: Priority;
    repeat?: RepeatConfig;
    subtasks: SubTask[];
    notes: TodoNote[];
    parentId?: number; // 상위 할 일 ID (계층 구조)
    categoryId?: string; // 카테고리 ID
    completedAt?: Date; // 완료일시
    timeTracking?: {
        started?: Date;
        stopped?: Date;
        totalTime?: number; // 밀리초 단위
    };
}

// 카테고리
export interface Category {
    id: string;
    name: string;
    color: string;
    parentId?: string; // 상위 카테고리 ID
}

// 사용자 설정
export interface UserSettings {
    id: "settings";
    theme: "light" | "dark" | "system";
    language: string;
    dateFormat: string;
    timeFormat: "12h" | "24h";
    defaultView: "list" | "calendar";
    defaultCalendarView: "day" | "week" | "month" | "year";
    startOfWeek: number; // 0 = 일요일, 1 = 월요일, etc.
}

// 템플릿
export interface TodoTemplate {
    id: string;
    name: string;
    description?: string;
    todoData: Omit<Todo, "id" | "createdAt" | "completedAt">;
}

// 통계 데이터
export interface StatsData {
    id: string;
    date: Date;
    completedCount: number;
    totalCount: number;
    categoryStats: Record<string, { completed: number; total: number }>;
    tagStats: Record<string, { completed: number; total: number }>;
}

const DB_NAME = "todo-app-db";
const TODO_STORE = "todos";
const CATEGORY_STORE = "categories";
const SETTINGS_STORE = "settings";
const TEMPLATE_STORE = "templates";
const STATS_STORE = "stats";
const DB_VERSION = 6; // 스키마 변경으로 버전 업 - transaction 객체 사용으로 수정

// 글로벌 DB 인스턴스 캐시
let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

// 데이터베이스 초기화
export const initDB = async () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // 초기 데이터베이스 생성 (버전 1)
                try {
                    if (oldVersion < 1) {
                        const todoStore = db.createObjectStore(TODO_STORE, {
                            keyPath: "id",
                            autoIncrement: true,
                        });
                        todoStore.createIndex("createdAt", "createdAt");
                        todoStore.createIndex("dueDate", "dueDate");
                    }
                } catch (error) {
                    console.error("Error during version 1 upgrade:", error);
                    throw error;
                }

                try {
                    // 버전 1에서 2로 업그레이드: 태그 필드 추가
                    if (oldVersion < 2 && oldVersion >= 1) {
                        console.log(
                            "Upgrading to version 2 (adding tags field)"
                        );
                        // 이미 생성된 스토어만 사용
                        if (db.objectStoreNames.contains(TODO_STORE)) {
                            // 인덱스 관련 작업만 수행하고 데이터 마이그레이션은 스킵
                            // 첫 데이터 액세스 시 필드가 없으면 기본값을 설정하는 방식으로 처리
                        }
                    }
                } catch (error) {
                    console.error("Error during version 2 upgrade:", error);
                    throw error;
                }

                try {
                    // 버전 2에서 3으로 업그레이드: 새로운 필드와 스토어 추가
                    if (oldVersion < 3) {
                        console.log(
                            "Upgrading to version 3 (adding new stores and fields)"
                        );

                        // 카테고리 스토어 생성
                        if (!db.objectStoreNames.contains(CATEGORY_STORE)) {
                            console.log("Creating category store");
                            const categoryStore = db.createObjectStore(
                                CATEGORY_STORE,
                                { keyPath: "id" }
                            );
                            categoryStore.createIndex("name", "name");
                        }

                        // 설정 스토어 생성
                        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                            console.log("Creating settings store");
                            const settingsStore = db.createObjectStore(
                                SETTINGS_STORE,
                                { keyPath: "id" }
                            );
                            // 기본 설정 추가 (transaction 내에서 수행)
                            settingsStore.put({
                                id: "settings",
                                theme: "system",
                                language: "ko",
                                dateFormat: "yyyy-MM-dd",
                                timeFormat: "24h",
                                defaultView: "list",
                                defaultCalendarView: "month",
                                startOfWeek: 0,
                            });
                        }

                        // 템플릿 스토어 생성
                        if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
                            console.log("Creating template store");
                            const templateStore = db.createObjectStore(
                                TEMPLATE_STORE,
                                { keyPath: "id" }
                            );
                            templateStore.createIndex("name", "name");
                        }

                        // 통계 스토어 생성
                        if (!db.objectStoreNames.contains(STATS_STORE)) {
                            console.log("Creating stats store");
                            const statsStore = db.createObjectStore(
                                STATS_STORE,
                                { keyPath: "id" }
                            );
                            statsStore.createIndex("date", "date");
                        }

                        // 기존 할 일 스토어에 인덱스 추가
                        if (db.objectStoreNames.contains(TODO_STORE)) {
                            console.log("Adding new indexes to todo store");
                            // 현재 upgrade 트랜잭션에서 스토어 접근
                            const todoStore =
                                transaction.objectStore(TODO_STORE);

                            // 필요한 인덱스 추가
                            const indexesToAdd = [
                                "startDate",
                                "endDate",
                                "priority",
                                "categoryId",
                                "parentId",
                                "completedAt",
                            ];

                            for (const indexName of indexesToAdd) {
                                if (!todoStore.indexNames.contains(indexName)) {
                                    todoStore.createIndex(indexName, indexName);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error during version 3 upgrade:", error);
                    throw error;
                }
            },
        });
    }

    return dbPromise;
};

// 기본 설정값 초기화 함수
export const initDefaultSettings = async () => {
    const db = await initDB();
    const settings = await db.get(SETTINGS_STORE, "settings");

    if (!settings) {
        await db.put(SETTINGS_STORE, {
            id: "settings",
            theme: "system",
            language: "ko",
            dateFormat: "yyyy-MM-dd",
            timeFormat: "24h",
            defaultView: "list",
            defaultCalendarView: "month",
            startOfWeek: 0,
        });
    }

    return settings || (await db.get(SETTINGS_STORE, "settings"));
};

// 데이터베이스 초기화 함수
export const resetDatabase = async (): Promise<boolean> => {
    try {
        // 기존 DB 연결 닫기
        dbPromise = null;

        // DB 삭제
        await deleteDB(DB_NAME);

        // DB 다시 초기화 - 새 버전으로 재생성
        console.log("Reinitializing database after reset");
        dbPromise = null;
        await initDB();

        // 기본 설정 초기화
        await initDefaultSettings();

        return true;
    } catch (error) {
        console.error("데이터베이스 초기화 중 오류 발생:", error);
        return false;
    }
};

// 할 일 관련 함수들
export const addTodo = async (todo: Omit<Todo, "id">): Promise<IDBValidKey> => {
    const db = await initDB();

    // 필수 필드 기본값 설정
    const newTodo: Omit<Todo, "id"> = {
        ...todo,
        createdAt: todo.createdAt || new Date(),
        tags: todo.tags || [],
        priority: todo.priority || Priority.MEDIUM,
        subtasks: todo.subtasks || [],
        notes: todo.notes || [],
        description: todo.description || "",
    };

    return db.add(TODO_STORE, newTodo);
};

export const getTodos = async (): Promise<Todo[]> => {
    const db = await initDB();
    // 잠시 지연하여 DB 초기화 완료되도록 보장
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 모든 할 일 가져오기
    const todos = await db.getAll(TODO_STORE);

    // 각 할 일에 대해 필수 필드가 없으면 기본값으로 설정
    return todos.map((todo) => ({
        ...todo,
        tags: todo.tags || [],
        priority: todo.priority || Priority.MEDIUM,
        subtasks: todo.subtasks || [],
        notes: todo.notes || [],
        description: todo.description || "",
    }));
};

// 특정 날짜의 할 일 조회 함수
export const getTodosByDate = async (date: Date): Promise<Todo[]> => {
    const db = await initDB();
    // 잠시 지연하여 DB 초기화 완료되도록 보장
    await new Promise((resolve) => setTimeout(resolve, 100));
    const allTodos = await db.getAll(TODO_STORE);

    // 날짜가 같은지 비교 (년, 월, 일만 비교)
    return allTodos.filter((todo) => {
        if (!todo.dueDate) return false;

        const todoDate = new Date(todo.dueDate);
        return (
            todoDate.getFullYear() === date.getFullYear() &&
            todoDate.getMonth() === date.getMonth() &&
            todoDate.getDate() === date.getDate()
        );
    });
};

// 날짜 범위의 할 일 조회 함수
export const getTodosByDateRange = async (
    startDate: Date,
    endDate: Date
): Promise<Todo[]> => {
    const db = await initDB();
    const allTodos = await db.getAll(TODO_STORE);

    return allTodos.filter((todo) => {
        if (!todo.dueDate) return false;

        const dueDate = new Date(todo.dueDate);
        return dueDate >= startDate && dueDate <= endDate;
    });
};

// 우선순위별 할 일 조회
export const getTodosByPriority = async (
    priority: Priority
): Promise<Todo[]> => {
    const db = await initDB();
    return db.getAllFromIndex(TODO_STORE, "priority", priority);
};

// 상위 할 일 조회
export const getParentTodos = async (): Promise<Todo[]> => {
    const db = await initDB();
    const allTodos = await db.getAll(TODO_STORE);
    return allTodos.filter((todo) => !todo.parentId);
};

// 하위 할 일 조회
export const getSubTodos = async (parentId: number): Promise<Todo[]> => {
    const db = await initDB();
    return db.getAllFromIndex(TODO_STORE, "parentId", parentId);
};

// 특정 카테고리의 할 일 조회
export const getTodosByCategory = async (
    categoryId: string
): Promise<Todo[]> => {
    const db = await initDB();
    return db.getAllFromIndex(TODO_STORE, "categoryId", categoryId);
};

// 태그로 할 일 조회 함수 추가
export const getTodosByTag = async (tag: string): Promise<Todo[]> => {
    const db = await initDB();
    const allTodos = await db.getAll(TODO_STORE);

    return allTodos.filter((todo) => todo.tags && todo.tags.includes(tag));
};

// 태그 목록 중 하나라도 포함된 할 일 조회 (OR 조건)
export const getTodosByAnyTags = async (tags: string[]): Promise<Todo[]> => {
    const db = await initDB();
    const allTodos = await db.getAll(TODO_STORE);

    return allTodos.filter(
        (todo) =>
            todo.tags && todo.tags.some((tag: string) => tags.includes(tag))
    );
};

// 태그 목록을 모두 포함하는 할 일 조회 (AND 조건)
export const getTodosByAllTags = async (tags: string[]): Promise<Todo[]> => {
    const db = await initDB();
    const allTodos = await db.getAll(TODO_STORE);

    return allTodos.filter(
        (todo) => todo.tags && tags.every((tag) => todo.tags.includes(tag))
    );
};

// 완료/미완료 할 일 조회
export const getTodosByCompletion = async (
    completed: boolean
): Promise<Todo[]> => {
    const db = await initDB();
    const allTodos = await db.getAll(TODO_STORE);

    return allTodos.filter((todo) => todo.completed === completed);
};

// 할 일 검색 (텍스트 기반)
export const searchTodos = async (query: string): Promise<Todo[]> => {
    const db = await initDB();
    const allTodos = await db.getAll(TODO_STORE);
    const lowerQuery = query.toLowerCase();

    return allTodos.filter(
        (todo) =>
            todo.text.toLowerCase().includes(lowerQuery) ||
            (todo.description &&
                todo.description.toLowerCase().includes(lowerQuery)) ||
            (todo.notes &&
                todo.notes.some((note: { content: string }) =>
                    note.content.toLowerCase().includes(lowerQuery)
                ))
    );
};

// 모든 태그 목록 조회 함수 추가
export const getAllTags = async (): Promise<string[]> => {
    const db = await initDB();
    const todos = await db.getAll(TODO_STORE);

    // 모든 할 일에서 태그를 추출하고 중복 제거
    const tagsSet = new Set<string>();

    todos.forEach((todo) => {
        if (todo.tags && todo.tags.length > 0) {
            todo.tags.forEach((tag: string) => tagsSet.add(tag));
        }
    });

    return Array.from(tagsSet);
};

// 할 일 업데이트
export const updateTodo = async (todo: Todo): Promise<IDBValidKey> => {
    const db = await initDB();
    return db.put(TODO_STORE, todo);
};

// 할 일 완료 상태 토글
export const toggleTodoCompletion = async (
    id: number,
    completed: boolean
): Promise<Todo | undefined> => {
    const db = await initDB();
    const todo = await db.get(TODO_STORE, id);

    if (todo) {
        todo.completed = completed;
        todo.completedAt = completed ? new Date() : undefined;
        await db.put(TODO_STORE, todo);
        return todo;
    }

    return undefined;
};

// 하위작업 추가
export const addSubtask = async (
    todoId: number,
    subtaskText: string
): Promise<Todo | undefined> => {
    const db = await initDB();
    const todo = await db.get(TODO_STORE, todoId);

    if (todo) {
        const newSubtask: SubTask = {
            id: uuid(),
            text: subtaskText,
            completed: false,
        };

        todo.subtasks = [...(todo.subtasks || []), newSubtask];
        await db.put(TODO_STORE, todo);
        return todo;
    }

    return undefined;
};

// 하위작업 상태 토글
export const toggleSubtask = async (
    todoId: number,
    subtaskId: string,
    completed: boolean
): Promise<Todo | undefined> => {
    const db = await initDB();
    const todo = await db.get(TODO_STORE, todoId);

    if (todo && todo.subtasks) {
        todo.subtasks = todo.subtasks.map((subtask: { id: string }) =>
            subtask.id === subtaskId ? { ...subtask, completed } : subtask
        );

        await db.put(TODO_STORE, todo);
        return todo;
    }

    return undefined;
};

// 메모 추가
export const addNote = async (
    todoId: number,
    content: string
): Promise<Todo | undefined> => {
    const db = await initDB();
    const todo = await db.get(TODO_STORE, todoId);

    if (todo) {
        const now = new Date();
        const newNote: TodoNote = {
            id: uuid(),
            content,
            createdAt: now,
            updatedAt: now,
        };

        todo.notes = [...(todo.notes || []), newNote];
        await db.put(TODO_STORE, todo);
        return todo;
    }

    return undefined;
};

// 시간 추적 시작
export const startTimeTracking = async (
    todoId: number
): Promise<Todo | undefined> => {
    const db = await initDB();
    const todo = await db.get(TODO_STORE, todoId);

    if (todo) {
        todo.timeTracking = {
            ...(todo.timeTracking || {}),
            started: new Date(),
            stopped: undefined,
        };

        await db.put(TODO_STORE, todo);
        return todo;
    }

    return undefined;
};

// 시간 추적 종료
export const stopTimeTracking = async (
    todoId: number
): Promise<Todo | undefined> => {
    const db = await initDB();
    const todo = await db.get(TODO_STORE, todoId);

    if (todo && todo.timeTracking && todo.timeTracking.started) {
        const now = new Date();
        const started = new Date(todo.timeTracking.started);
        const elapsed = now.getTime() - started.getTime();

        todo.timeTracking = {
            started: todo.timeTracking.started,
            stopped: now,
            totalTime: (todo.timeTracking.totalTime || 0) + elapsed,
        };

        await db.put(TODO_STORE, todo);
        return todo;
    }

    return undefined;
};

// 할 일 삭제
export const deleteTodo = async (id: number): Promise<void> => {
    const db = await initDB();
    return db.delete(TODO_STORE, id);
};

// 모든 할 일 삭제
export const deleteAllTodos = async (): Promise<boolean> => {
    try {
        const db = await initDB();
        const tx = db.transaction(TODO_STORE, "readwrite");
        const store = tx.objectStore(TODO_STORE);

        // 모든 항목을 가져옵니다
        const keys = await store.getAllKeys();

        // 모든 키를 순회하며 항목 삭제
        for (const key of keys) {
            await store.delete(key);
        }

        // 트랜잭션 완료 대기
        await tx.done;

        return true;
    } catch (error) {
        console.error("모든 할 일 삭제 중 오류 발생:", error);
        return false;
    }
};

// 카테고리 관련 함수
export const addCategory = async (
    category: Omit<Category, "id">
): Promise<Category> => {
    const db = await initDB();
    const newCategory: Category = {
        ...category,
        id: uuid(),
    };

    await db.add(CATEGORY_STORE, newCategory);
    return newCategory;
};

export const getCategories = async (): Promise<Category[]> => {
    const db = await initDB();
    return db.getAll(CATEGORY_STORE);
};

export const updateCategory = async (category: Category): Promise<Category> => {
    const db = await initDB();
    await db.put(CATEGORY_STORE, category);
    return category;
};

export const deleteCategory = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(CATEGORY_STORE, id);

    // 이 카테고리에 속한 할 일의 카테고리 값도 제거
    const todos = await getTodosByCategory(id);
    for (const todo of todos) {
        todo.categoryId = undefined;
        await updateTodo(todo);
    }
};

// 설정 관련 함수
export const getSettings = async (): Promise<UserSettings> => {
    const db = await initDB();
    let settings = await db.get(SETTINGS_STORE, "settings");

    if (!settings) {
        settings = await initDefaultSettings();
    }

    return settings;
};

export const updateSettings = async (
    settings: Partial<UserSettings>
): Promise<UserSettings> => {
    const db = await initDB();
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...settings };

    await db.put(SETTINGS_STORE, updatedSettings);
    return updatedSettings;
};

// 템플릿 관련 함수
export const addTemplate = async (
    template: Omit<TodoTemplate, "id">
): Promise<TodoTemplate> => {
    const db = await initDB();
    const newTemplate: TodoTemplate = {
        ...template,
        id: uuid(),
    };

    await db.add(TEMPLATE_STORE, newTemplate);
    return newTemplate;
};

export const getTemplates = async (): Promise<TodoTemplate[]> => {
    const db = await initDB();
    return db.getAll(TEMPLATE_STORE);
};

export const updateTemplate = async (
    template: TodoTemplate
): Promise<TodoTemplate> => {
    const db = await initDB();
    await db.put(TEMPLATE_STORE, template);
    return template;
};

export const deleteTemplate = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(TEMPLATE_STORE, id);
};

// 템플릿으로 할 일 생성
export const createTodoFromTemplate = async (
    templateId: string
): Promise<number | undefined> => {
    const db = await initDB();
    const template = await db.get(TEMPLATE_STORE, templateId);

    if (template) {
        const todoData = {
            ...template.todoData,
            createdAt: new Date(),
        };

        const id = await addTodo(todoData);
        return typeof id === "number" ? id : undefined;
    }

    return undefined;
};

// 통계 관련 함수
export const updateDailyStats = async (): Promise<void> => {
    const db = await initDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = today.toISOString().split("T")[0];
    const statsId = `stats_${todayStr}`;

    // 오늘의 할 일 가져오기
    const allTodos = await db.getAll(TODO_STORE);
    const categories = await db.getAll(CATEGORY_STORE);

    // 카테고리 통계 초기화
    const categoryStats: Record<string, { completed: number; total: number }> =
        {};
    categories.forEach((cat) => {
        categoryStats[cat.id] = { completed: 0, total: 0 };
    });

    // 태그 통계 초기화
    const tags = await getAllTags();
    const tagStats: Record<string, { completed: number; total: number }> = {};
    tags.forEach((tag) => {
        tagStats[tag] = { completed: 0, total: 0 };
    });

    // 통계 계산
    let completedCount = 0;
    let totalCount = 0;

    allTodos.forEach((todo) => {
        // 완료 통계
        if (todo.completedAt) {
            const completedDate = new Date(todo.completedAt);
            if (completedDate.toISOString().split("T")[0] === todayStr) {
                completedCount++;
            }
        }

        // 총 통계 (오늘 마감일인 할 일)
        if (todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            if (dueDate.toISOString().split("T")[0] === todayStr) {
                totalCount++;

                // 카테고리 통계
                if (todo.categoryId && categoryStats[todo.categoryId]) {
                    categoryStats[todo.categoryId].total++;
                    if (todo.completed) {
                        categoryStats[todo.categoryId].completed++;
                    }
                }

                // 태그 통계
                if (todo.tags) {
                    todo.tags.forEach((tag: string | number) => {
                        if (tagStats[tag]) {
                            tagStats[tag].total++;
                            if (todo.completed) {
                                tagStats[tag].completed++;
                            }
                        }
                    });
                }
            }
        }
    });

    // 통계 저장
    const statsData: StatsData = {
        id: statsId,
        date: today,
        completedCount,
        totalCount,
        categoryStats,
        tagStats,
    };

    await db.put(STATS_STORE, statsData);
};

// 특정 기간의 통계 가져오기
export const getStatsRange = async (
    startDate: Date,
    endDate: Date
): Promise<StatsData[]> => {
    const db = await initDB();
    const allStats = await db.getAll(STATS_STORE);

    return allStats.filter((stats) => {
        const statsDate = new Date(stats.date);
        return statsDate >= startDate && statsDate <= endDate;
    });
};
