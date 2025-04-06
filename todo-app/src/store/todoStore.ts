import { create } from "zustand";
import {
    Todo,
    Category,
    Priority,
    TodoTemplate,
    UserSettings,
    StatsData,
} from "../db";
import * as db from "../db";

interface TodoState {
    // 데이터 상태
    todos: Todo[];
    categories: Category[];
    templates: TodoTemplate[];
    settings: UserSettings | null;
    stats: StatsData[];

    // 필터링 상태
    selectedDate: Date;
    selectedTags: string[];
    selectedCategories: string[];
    selectedPriority: Priority | null;
    searchQuery: string;
    completionFilter: "all" | "completed" | "active";

    // UI 상태
    isLoading: boolean;
    activeView: "list" | "calendar";
    calendarViewType: "day" | "week" | "month" | "year";
    selectedTodo: Todo | null;
    editingTodo: Todo | null;
    refreshTrigger: number;

    // 액션
    loadData: () => Promise<void>;
    refreshData: () => void;
    addTodo: (todo: Omit<Todo, "id">) => Promise<IDBValidKey | undefined>;
    updateTodo: (todo: Todo) => Promise<void>;
    deleteTodo: (id: number) => Promise<void>;
    toggleCompletion: (id: number, completed: boolean) => Promise<void>;

    // 필터 액션
    setSelectedDate: (date: Date) => void;
    setSelectedTags: (tags: string[]) => void;
    toggleTag: (tag: string) => void;
    setSelectedCategories: (categories: string[]) => void;
    toggleCategory: (categoryId: string) => void;
    setSelectedPriority: (priority: Priority | null) => void;
    setSearchQuery: (query: string) => void;
    setCompletionFilter: (filter: "all" | "completed" | "active") => void;
    clearFilters: () => void;

    // UI 액션
    setActiveView: (view: "list" | "calendar") => void;
    setCalendarViewType: (type: "day" | "week" | "month" | "year") => void;
    setSelectedTodo: (todo: Todo | null) => void;
    setEditingTodo: (todo: Todo | null) => void;

    // 카테고리 액션
    addCategory: (
        category: Omit<Category, "id">
    ) => Promise<Category | undefined>;
    updateCategory: (category: Category) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    // 템플릿 액션
    addTemplate: (
        template: Omit<TodoTemplate, "id">
    ) => Promise<TodoTemplate | undefined>;
    updateTemplate: (template: TodoTemplate) => Promise<void>;
    deleteTemplate: (id: string) => Promise<void>;
    createFromTemplate: (templateId: string) => Promise<void>;

    // 설정 액션
    updateSettings: (settings: Partial<UserSettings>) => Promise<void>;

    // 고급 할 일 액션
    addSubtask: (todoId: number, text: string) => Promise<void>;
    toggleSubtask: (
        todoId: number,
        subtaskId: string,
        completed: boolean
    ) => Promise<void>;
    addNote: (todoId: number, content: string) => Promise<void>;
    startTimeTracking: (todoId: number) => Promise<void>;
    stopTimeTracking: (todoId: number) => Promise<void>;

    // 필터된 할 일 가져오기
    getFilteredTodos: () => Todo[];
}

// 기본 필터링 함수
const filterTodos = (
    todos: Todo[],
    selectedDate: Date | null,
    selectedTags: string[],
    selectedCategories: string[],
    selectedPriority: Priority | null,
    searchQuery: string,
    completionFilter: "all" | "completed" | "active"
): Todo[] => {
    return todos.filter((todo) => {
        // 날짜 필터
        if (selectedDate && todo.dueDate) {
            const todoDate = new Date(todo.dueDate);
            const isSameDay =
                todoDate.getFullYear() === selectedDate.getFullYear() &&
                todoDate.getMonth() === selectedDate.getMonth() &&
                todoDate.getDate() === selectedDate.getDate();

            if (!isSameDay) return false;
        }

        // 태그 필터 (AND 조건)
        if (selectedTags.length > 0) {
            if (
                !todo.tags ||
                !selectedTags.every((tag) => todo.tags.includes(tag))
            ) {
                return false;
            }
        }

        // 카테고리 필터
        if (selectedCategories.length > 0) {
            if (
                !todo.categoryId ||
                !selectedCategories.includes(todo.categoryId)
            ) {
                return false;
            }
        }

        // 우선순위 필터
        if (selectedPriority !== null && todo.priority !== selectedPriority) {
            return false;
        }

        // 검색어 필터
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const textMatch = todo.text.toLowerCase().includes(query);
            const descMatch = todo.description
                ? todo.description.toLowerCase().includes(query)
                : false;
            const tagsMatch = todo.tags
                ? todo.tags.some((tag) => tag.toLowerCase().includes(query))
                : false;
            const notesMatch = todo.notes
                ? todo.notes.some((note) =>
                      note.content.toLowerCase().includes(query)
                  )
                : false;

            if (!(textMatch || descMatch || tagsMatch || notesMatch)) {
                return false;
            }
        }

        // 완료 상태 필터
        if (completionFilter === "completed" && !todo.completed) {
            return false;
        } else if (completionFilter === "active" && todo.completed) {
            return false;
        }

        return true;
    });
};

// TodoStore 생성
export const useTodoStore = create<TodoState>((set, get) => ({
    // 초기 상태
    todos: [],
    categories: [],
    templates: [],
    settings: null,
    stats: [],

    selectedDate: new Date(),
    selectedTags: [],
    selectedCategories: [],
    selectedPriority: null,
    searchQuery: "",
    completionFilter: "all",

    isLoading: false,
    activeView: "list",
    calendarViewType: "month",
    selectedTodo: null,
    editingTodo: null,
    refreshTrigger: 0,

    // 필터된 할 일 가져오기
    getFilteredTodos: () => {
        const {
            todos,
            selectedDate,
            selectedTags,
            selectedCategories,
            selectedPriority,
            searchQuery,
            completionFilter,
        } = get();

        return filterTodos(
            todos,
            selectedDate,
            selectedTags,
            selectedCategories,
            selectedPriority,
            searchQuery,
            completionFilter
        );
    },

    // 데이터 로드
    loadData: async () => {
        set({ isLoading: true });

        try {
            const [todos, categories, templates, settings] = await Promise.all([
                db.getTodos(),
                db.getCategories(),
                db.getTemplates(),
                db.getSettings(),
            ]);

            // 오늘 기준 일주일 통계
            const today = new Date();
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const stats = await db.getStatsRange(weekAgo, today);

            set({
                todos,
                categories,
                templates,
                settings,
                stats,
                isLoading: false,
            });
        } catch (error) {
            console.error("데이터 로드 중 오류 발생:", error);
            set({ isLoading: false });
        }
    },

    // 데이터 새로고침
    refreshData: () => {
        const { loadData } = get();
        loadData();
        set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }));
    },

    // 할 일 추가
    addTodo: async (todo: Omit<Todo, "id">) => {
        try {
            const id = await db.addTodo(todo);
            get().refreshData();
            return id;
        } catch (error) {
            console.error("할 일 추가 중 오류 발생:", error);
            return undefined;
        }
    },

    // 할 일 업데이트
    updateTodo: async (todo: Todo) => {
        try {
            await db.updateTodo(todo);
            get().refreshData();
        } catch (error) {
            console.error("할 일 업데이트 중 오류 발생:", error);
        }
    },

    // 할 일 삭제
    deleteTodo: async (id: number) => {
        try {
            await db.deleteTodo(id);
            get().refreshData();
        } catch (error) {
            console.error("할 일 삭제 중 오류 발생:", error);
        }
    },

    // 완료 상태 토글
    toggleCompletion: async (id: number, completed: boolean) => {
        try {
            await db.toggleTodoCompletion(id, completed);
            get().refreshData();
        } catch (error) {
            console.error("완료 상태 토글 중 오류 발생:", error);
        }
    },

    // 필터 액션
    setSelectedDate: (date: Date) => set({ selectedDate: date }),
    setSelectedTags: (tags: string[]) => set({ selectedTags: tags }),
    toggleTag: (tag: string) => {
        const { selectedTags } = get();
        if (selectedTags.includes(tag)) {
            set({ selectedTags: selectedTags.filter((t) => t !== tag) });
        } else {
            set({ selectedTags: [...selectedTags, tag] });
        }
    },
    setSelectedCategories: (categories: string[]) =>
        set({ selectedCategories: categories }),
    toggleCategory: (categoryId: string) => {
        const { selectedCategories } = get();
        if (selectedCategories.includes(categoryId)) {
            set({
                selectedCategories: selectedCategories.filter(
                    (c) => c !== categoryId
                ),
            });
        } else {
            set({ selectedCategories: [...selectedCategories, categoryId] });
        }
    },
    setSelectedPriority: (priority: Priority | null) =>
        set({ selectedPriority: priority }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setCompletionFilter: (filter: "all" | "completed" | "active") =>
        set({ completionFilter: filter }),
    clearFilters: () =>
        set({
            selectedTags: [],
            selectedCategories: [],
            selectedPriority: null,
            searchQuery: "",
            completionFilter: "all",
        }),

    // UI 액션
    setActiveView: (view: "list" | "calendar") => set({ activeView: view }),
    setCalendarViewType: (type: "day" | "week" | "month" | "year") =>
        set({ calendarViewType: type }),
    setSelectedTodo: (todo: Todo | null) => set({ selectedTodo: todo }),
    setEditingTodo: (todo: Todo | null) => set({ editingTodo: todo }),

    // 카테고리 액션
    addCategory: async (category: Omit<Category, "id">) => {
        try {
            const newCategory = await db.addCategory(category);
            get().refreshData();
            return newCategory;
        } catch (error) {
            console.error("카테고리 추가 중 오류 발생:", error);
            return undefined;
        }
    },
    updateCategory: async (category: Category) => {
        try {
            await db.updateCategory(category);
            get().refreshData();
        } catch (error) {
            console.error("카테고리 업데이트 중 오류 발생:", error);
        }
    },
    deleteCategory: async (id: string) => {
        try {
            await db.deleteCategory(id);
            get().refreshData();
        } catch (error) {
            console.error("카테고리 삭제 중 오류 발생:", error);
        }
    },

    // 템플릿 액션
    addTemplate: async (template: Omit<TodoTemplate, "id">) => {
        try {
            const newTemplate = await db.addTemplate(template);
            get().refreshData();
            return newTemplate;
        } catch (error) {
            console.error("템플릿 추가 중 오류 발생:", error);
            return undefined;
        }
    },
    updateTemplate: async (template: TodoTemplate) => {
        try {
            await db.updateTemplate(template);
            get().refreshData();
        } catch (error) {
            console.error("템플릿 업데이트 중 오류 발생:", error);
        }
    },
    deleteTemplate: async (id: string) => {
        try {
            await db.deleteTemplate(id);
            get().refreshData();
        } catch (error) {
            console.error("템플릿 삭제 중 오류 발생:", error);
        }
    },
    createFromTemplate: async (templateId: string) => {
        try {
            await db.createTodoFromTemplate(templateId);
            get().refreshData();
        } catch (error) {
            console.error("템플릿으로 할 일 생성 중 오류 발생:", error);
        }
    },

    // 설정 액션
    updateSettings: async (settings: Partial<UserSettings>) => {
        try {
            const updatedSettings = await db.updateSettings(settings);
            set({ settings: updatedSettings });
        } catch (error) {
            console.error("설정 업데이트 중 오류 발생:", error);
        }
    },

    // 고급 할 일 액션
    addSubtask: async (todoId: number, text: string) => {
        try {
            await db.addSubtask(todoId, text);
            get().refreshData();
        } catch (error) {
            console.error("하위작업 추가 중 오류 발생:", error);
        }
    },
    toggleSubtask: async (
        todoId: number,
        subtaskId: string,
        completed: boolean
    ) => {
        try {
            await db.toggleSubtask(todoId, subtaskId, completed);
            get().refreshData();
        } catch (error) {
            console.error("하위작업 토글 중 오류 발생:", error);
        }
    },
    addNote: async (todoId: number, content: string) => {
        try {
            await db.addNote(todoId, content);
            get().refreshData();
        } catch (error) {
            console.error("메모 추가 중 오류 발생:", error);
        }
    },
    startTimeTracking: async (todoId: number) => {
        try {
            await db.startTimeTracking(todoId);
            get().refreshData();
        } catch (error) {
            console.error("시간 추적 시작 중 오류 발생:", error);
        }
    },
    stopTimeTracking: async (todoId: number) => {
        try {
            await db.stopTimeTracking(todoId);
            get().refreshData();
        } catch (error) {
            console.error("시간 추적 종료 중 오류 발생:", error);
        }
    },
}));
