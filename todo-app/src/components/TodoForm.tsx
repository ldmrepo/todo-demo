import { format, setHours, setMinutes } from "date-fns";
import React, { useEffect, useState } from "react";
import { Priority, RepeatConfig, RepeatType, Todo } from "../db";
import { useTodoStore } from "../store/todoStore";
import { TagInput } from "./TagInput";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

interface TodoFormProps {
    onSubmit: () => void;
    onCancel?: () => void;
    initialTodo?: Todo | null;
}

export function TodoForm({ onSubmit, onCancel, initialTodo }: TodoFormProps) {
    const {
        addTodo,
        updateTodo,
        categories,
        selectedTodo,
        setSelectedTodo,
        addCategory,
        addSubtask,
    } = useTodoStore();

    // 기본 필드
    const [text, setText] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
    const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

    // 날짜 관련
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [selectedHour, setSelectedHour] = useState<number>(9);
    const [selectedMinute, setSelectedMinute] = useState<number>(0);

    // 반복 설정
    const [repeatType, setRepeatType] = useState<RepeatType>(RepeatType.NONE);
    const [repeatInterval, setRepeatInterval] = useState<number>(1);
    const [repeatDaysOfWeek, setRepeatDaysOfWeek] = useState<number[]>([]);
    const [repeatEndDate, setRepeatEndDate] = useState<Date | undefined>(
        undefined
    );
    const [repeatOccurrence, setRepeatOccurrence] = useState<number>(0);

    // UI 상태
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMode, setCalendarMode] = useState<
        "dueDate" | "startDate" | "endDate" | "repeatEndDate"
    >("dueDate");
    const [showTimeSelector, setShowTimeSelector] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");

    // 하위작업 관련
    const [subtasks, setSubtasks] = useState<
        { id?: string; text: string; completed: boolean }[]
    >([]);
    const [newSubtaskText, setNewSubtaskText] = useState("");

    // 카테고리 관련
    const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6"); // 기본 파란색

    // 초기 데이터 로드
    useEffect(() => {
        if (initialTodo) {
            setText(initialTodo.text);
            setDescription(initialTodo.description || "");
            setTags(initialTodo.tags || []);
            setPriority(initialTodo.priority || Priority.MEDIUM);
            setCategoryId(initialTodo.categoryId);
            setDueDate(initialTodo.dueDate);
            setStartDate(initialTodo.startDate);
            setEndDate(initialTodo.endDate);

            // 시간 설정
            if (initialTodo.dueDate) {
                const date = new Date(initialTodo.dueDate);
                setSelectedHour(date.getHours());
                setSelectedMinute(date.getMinutes());
            }

            // 반복 설정
            if (initialTodo.repeat) {
                setRepeatType(initialTodo.repeat.type || RepeatType.NONE);
                setRepeatInterval(initialTodo.repeat.interval || 1);
                setRepeatDaysOfWeek(initialTodo.repeat.daysOfWeek || []);
                setRepeatEndDate(initialTodo.repeat.endDate);
                setRepeatOccurrence(initialTodo.repeat.occurrence || 0);
            }

            // 하위작업
            if (initialTodo.subtasks) {
                setSubtasks(
                    initialTodo.subtasks.map((st) => ({
                        id: st.id,
                        text: st.text,
                        completed: st.completed,
                    }))
                );
            }
        }
    }, [initialTodo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        try {
            // 날짜가 선택되었다면 시간 정보 추가
            let finalDueDate = dueDate;
            if (finalDueDate) {
                finalDueDate = new Date(finalDueDate);
                if (selectedHour !== undefined) {
                    finalDueDate = setHours(finalDueDate, selectedHour);
                }
                if (selectedMinute !== undefined) {
                    finalDueDate = setMinutes(finalDueDate, selectedMinute);
                }
            }

            // 반복 설정 구성
            let repeatConfig: RepeatConfig | undefined;
            if (repeatType !== RepeatType.NONE) {
                repeatConfig = {
                    type: repeatType,
                    interval: repeatInterval,
                    daysOfWeek:
                        repeatType === RepeatType.WEEKLY
                            ? repeatDaysOfWeek
                            : undefined,
                    endDate: repeatEndDate,
                    occurrence:
                        repeatOccurrence > 0 ? repeatOccurrence : undefined,
                };
            }

            if (initialTodo) {
                // 기존 할 일 업데이트
                const updatedTodo: Todo = {
                    ...initialTodo,
                    text: text.trim(),
                    description: description.trim() || undefined,
                    dueDate: finalDueDate,
                    startDate,
                    endDate,
                    tags,
                    priority,
                    categoryId,
                    repeat: repeatConfig,
                    subtasks: subtasks.map((st) => ({
                        id: st.id || crypto.randomUUID(),
                        text: st.text,
                        completed: st.completed,
                    })),
                };

                await updateTodo(updatedTodo);
            } else {
                // 새 할 일 추가
                const newTodo: Omit<Todo, "id"> = {
                    text: text.trim(),
                    description: description.trim() || undefined,
                    completed: false,
                    createdAt: new Date(),
                    dueDate: finalDueDate,
                    startDate,
                    endDate,
                    tags,
                    priority,
                    categoryId,
                    repeat: repeatConfig,
                    subtasks: subtasks.map((st) => ({
                        id: st.id || crypto.randomUUID(),
                        text: st.text,
                        completed: st.completed,
                    })),
                    notes: [],
                };

                await addTodo(newTodo);
            }

            // 폼 초기화
            resetForm();

            // 제출 완료 콜백
            onSubmit();
        } catch (error) {
            console.error("Error saving todo:", error);
        }
    };

    const resetForm = () => {
        setText("");
        setDescription("");
        setTags([]);
        setPriority(Priority.MEDIUM);
        setCategoryId(undefined);
        setDueDate(undefined);
        setStartDate(undefined);
        setEndDate(undefined);
        setRepeatType(RepeatType.NONE);
        setRepeatInterval(1);
        setRepeatDaysOfWeek([]);
        setRepeatEndDate(undefined);
        setRepeatOccurrence(0);
        setSubtasks([]);
        setShowCalendar(false);
        setShowTimeSelector(false);
        setActiveTab("basic");
    };

    const handleAddSubtask = () => {
        if (!newSubtaskText.trim()) return;

        setSubtasks([
            ...subtasks,
            {
                text: newSubtaskText.trim(),
                completed: false,
            },
        ]);
        setNewSubtaskText("");
    };

    const handleRemoveSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const newCategory = await addCategory({
                name: newCategoryName.trim(),
                color: newCategoryColor,
            });

            if (newCategory) {
                setCategoryId(newCategory.id);
                setShowNewCategoryDialog(false);
                setNewCategoryName("");
            }
        } catch (error) {
            console.error("Error creating category:", error);
        }
    };

    const handleCalendarSelect = (date: Date | undefined) => {
        if (calendarMode === "dueDate") {
            setDueDate(date);
        } else if (calendarMode === "startDate") {
            setStartDate(date);
        } else if (calendarMode === "endDate") {
            setEndDate(date);
        } else if (calendarMode === "repeatEndDate") {
            setRepeatEndDate(date);
        }

        if (date) {
            setShowCalendar(false);
            setShowTimeSelector(calendarMode === "dueDate");
        }
    };

    const formatDateTime = (
        date: Date | undefined,
        includeTime: boolean = true
    ) => {
        if (!date) return "날짜 선택";

        let formattedDate = format(date, "yyyy년 MM월 dd일");

        if (
            includeTime &&
            selectedHour !== undefined &&
            selectedMinute !== undefined
        ) {
            const hourStr = selectedHour.toString().padStart(2, "0");
            const minuteStr = selectedMinute.toString().padStart(2, "0");
            return `${formattedDate} ${hourStr}:${minuteStr}`;
        }

        return formattedDate;
    };

    // 요일 선택기
    const renderDayOfWeekSelector = () => {
        const days = ["일", "월", "화", "수", "목", "금", "토"];

        return (
            <div className="mt-2">
                <label className="text-sm font-medium">반복할 요일 선택</label>
                <div className="flex mt-1 space-x-2">
                    {days.map((day, index) => (
                        <Button
                            key={index}
                            type="button"
                            size="sm"
                            variant={
                                repeatDaysOfWeek.includes(index)
                                    ? "default"
                                    : "outline"
                            }
                            onClick={() => {
                                if (repeatDaysOfWeek.includes(index)) {
                                    setRepeatDaysOfWeek(
                                        repeatDaysOfWeek.filter(
                                            (d) => d !== index
                                        )
                                    );
                                } else {
                                    setRepeatDaysOfWeek([
                                        ...repeatDaysOfWeek,
                                        index,
                                    ]);
                                }
                            }}
                        >
                            {day}
                        </Button>
                    ))}
                </div>
            </div>
        );
    };

    // 시간 선택기 렌더링
    const renderTimeSelector = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minutes = [0, 15, 30, 45];

        return (
            <div className="mt-2 border rounded-md p-4 bg-background">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            시간
                        </label>
                        <div className="grid grid-cols-4 gap-1 max-h-[200px] overflow-y-auto">
                            {hours.map((hour) => (
                                <Button
                                    key={hour}
                                    type="button"
                                    variant={
                                        selectedHour === hour
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setSelectedHour(hour)}
                                    className="text-center"
                                >
                                    {hour}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            분
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                            {minutes.map((minute) => (
                                <Button
                                    key={minute}
                                    type="button"
                                    variant={
                                        selectedMinute === minute
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setSelectedMinute(minute)}
                                    className="text-center"
                                >
                                    {minute}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowTimeSelector(false)}
                        size="sm"
                    >
                        확인
                    </Button>
                </div>
            </div>
        );
    };

    const openCalendarDatePicker = (
        mode: "dueDate" | "startDate" | "endDate" | "repeatEndDate"
    ) => {
        setCalendarMode(mode);
        setShowCalendar(true);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="basic">기본 정보</TabsTrigger>
                    <TabsTrigger value="advanced">고급 설정</TabsTrigger>
                    <TabsTrigger value="subtasks">하위 작업</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                    {/* 제목 입력 */}
                    <div>
                        <label className="text-sm font-medium block mb-1">
                            제목
                        </label>
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="할 일을 입력하세요..."
                            className="w-full"
                            required
                        />
                    </div>

                    {/* 설명 입력 */}
                    <div>
                        <label className="text-sm font-medium block mb-1">
                            설명
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="할 일에 대한 상세 설명을 입력하세요..."
                            className="w-full"
                            rows={3}
                        />
                    </div>

                    {/* 태그 입력 필드 */}
                    <div>
                        <label className="text-sm font-medium block mb-1">
                            태그
                        </label>
                        <TagInput
                            tags={tags}
                            onTagsChange={setTags}
                            placeholder="태그 입력 후 Enter"
                        />
                    </div>

                    {/* 우선순위 선택 */}
                    <div>
                        <label className="text-sm font-medium block mb-1">
                            우선순위
                        </label>
                        <Select
                            value={priority}
                            onValueChange={(value) =>
                                setPriority(value as Priority)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="우선순위 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={Priority.LOW}>
                                    낮음
                                </SelectItem>
                                <SelectItem value={Priority.MEDIUM}>
                                    중간
                                </SelectItem>
                                <SelectItem value={Priority.HIGH}>
                                    높음
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 카테고리 선택 */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium">
                                카테고리
                            </label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNewCategoryDialog(true)}
                                className="text-xs"
                            >
                                + 새 카테고리
                            </Button>
                        </div>

                        <Select
                            value={categoryId || "_none"}
                            onValueChange={(value) =>
                                setCategoryId(
                                    value === "_none" ? undefined : value
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="카테고리 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_none">
                                    카테고리 없음
                                </SelectItem>
                                {categories.map((category) => (
                                    <SelectItem
                                        key={category.id}
                                        value={category.id}
                                    >
                                        <div className="flex items-center">
                                            <div
                                                className="w-3 h-3 rounded-full mr-2"
                                                style={{
                                                    backgroundColor:
                                                        category.color,
                                                }}
                                            />
                                            {category.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 마감일 선택 */}
                    <div>
                        <label className="text-sm font-medium block mb-1">
                            마감일
                        </label>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => openCalendarDatePicker("dueDate")}
                            className="w-full justify-start text-left"
                        >
                            {dueDate
                                ? formatDateTime(dueDate)
                                : "날짜 선택하기"}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                    {/* 시작일, 종료일 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium block mb-1">
                                시작일
                            </label>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    openCalendarDatePicker("startDate")
                                }
                                className="w-full justify-start text-left"
                            >
                                {startDate
                                    ? formatDateTime(startDate, false)
                                    : "날짜 선택하기"}
                            </Button>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">
                                종료일
                            </label>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    openCalendarDatePicker("endDate")
                                }
                                className="w-full justify-start text-left"
                            >
                                {endDate
                                    ? formatDateTime(endDate, false)
                                    : "날짜 선택하기"}
                            </Button>
                        </div>
                    </div>

                    {/* 반복 설정 */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium block">
                            반복 설정
                        </label>
                        <Select
                            value={repeatType}
                            onValueChange={(value) =>
                                setRepeatType(value as RepeatType)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="반복 유형 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={RepeatType.NONE}>
                                    반복 안함
                                </SelectItem>
                                <SelectItem value={RepeatType.DAILY}>
                                    매일
                                </SelectItem>
                                <SelectItem value={RepeatType.WEEKLY}>
                                    매주
                                </SelectItem>
                                <SelectItem value={RepeatType.MONTHLY}>
                                    매월
                                </SelectItem>
                                <SelectItem value={RepeatType.YEARLY}>
                                    매년
                                </SelectItem>
                                <SelectItem value={RepeatType.CUSTOM}>
                                    사용자 정의
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {repeatType !== RepeatType.NONE && (
                            <>
                                {repeatType !== RepeatType.CUSTOM && (
                                    <div className="grid grid-cols-2 gap-2 items-end">
                                        <div>
                                            <label className="text-sm font-medium block mb-1">
                                                간격
                                            </label>
                                            <div className="flex items-center">
                                                <Input
                                                    type="number"
                                                    value={repeatInterval}
                                                    onChange={(e) =>
                                                        setRepeatInterval(
                                                            parseInt(
                                                                e.target.value
                                                            ) || 1
                                                        )
                                                    }
                                                    min={1}
                                                    className="w-full"
                                                />
                                                <span className="ml-2">
                                                    {repeatType ===
                                                    RepeatType.DAILY
                                                        ? "일"
                                                        : repeatType ===
                                                          RepeatType.WEEKLY
                                                        ? "주"
                                                        : repeatType ===
                                                          RepeatType.MONTHLY
                                                        ? "월"
                                                        : "년"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {repeatType === RepeatType.WEEKLY &&
                                    renderDayOfWeekSelector()}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium block">
                                        종료 설정
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm block mb-1">
                                                반복 횟수
                                            </label>
                                            <Input
                                                type="number"
                                                value={repeatOccurrence || ""}
                                                onChange={(e) =>
                                                    setRepeatOccurrence(
                                                        parseInt(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                placeholder="무제한"
                                                min={0}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm block mb-1">
                                                종료일
                                            </label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    openCalendarDatePicker(
                                                        "repeatEndDate"
                                                    )
                                                }
                                                className="w-full justify-start text-left"
                                            >
                                                {repeatEndDate
                                                    ? formatDateTime(
                                                          repeatEndDate,
                                                          false
                                                      )
                                                    : "날짜 선택하기"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="subtasks" className="space-y-4">
                    {/* 하위 작업 추가 */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium block">
                            하위 작업
                        </label>
                        <div className="flex space-x-2">
                            <Input
                                value={newSubtaskText}
                                onChange={(e) =>
                                    setNewSubtaskText(e.target.value)
                                }
                                placeholder="새 하위 작업 추가"
                                className="flex-1"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddSubtask();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddSubtask}>
                                추가
                            </Button>
                        </div>
                    </div>

                    {/* 하위 작업 목록 */}
                    {subtasks.length > 0 ? (
                        <div className="space-y-2">
                            {subtasks.map((task, index) => (
                                <div
                                    key={task.id || index}
                                    className="flex items-center space-x-2 border p-2 rounded"
                                >
                                    <Input
                                        value={task.text}
                                        onChange={(e) => {
                                            const updatedSubtasks = [
                                                ...subtasks,
                                            ];
                                            updatedSubtasks[index].text =
                                                e.target.value;
                                            setSubtasks(updatedSubtasks);
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleRemoveSubtask(index)
                                        }
                                    >
                                        삭제
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            하위 작업이 없습니다. 위에서 추가해보세요!
                        </p>
                    )}
                </TabsContent>
            </Tabs>

            {/* 캘린더 팝업 */}
            {showCalendar && (
                <div className="mt-2 border rounded-md p-3 bg-background">
                    <Calendar
                        mode="single"
                        selected={
                            calendarMode === "dueDate"
                                ? dueDate
                                : calendarMode === "startDate"
                                ? startDate
                                : calendarMode === "endDate"
                                ? endDate
                                : repeatEndDate
                        }
                        onSelect={handleCalendarSelect}
                        initialFocus
                    />
                </div>
            )}

            {/* 시간 선택기 */}
            {showTimeSelector && renderTimeSelector()}

            {/* 새 카테고리 다이얼로그 */}
            <Dialog
                open={showNewCategoryDialog}
                onOpenChange={setShowNewCategoryDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>새 카테고리 추가</DialogTitle>
                        <DialogDescription>
                            새로운 카테고리를 생성하여 할 일을 구분하세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div>
                            <label className="text-sm font-medium block mb-1">
                                카테고리 이름
                            </label>
                            <Input
                                value={newCategoryName}
                                onChange={(e) =>
                                    setNewCategoryName(e.target.value)
                                }
                                placeholder="카테고리 이름 입력"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1">
                                색상
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                                {[
                                    "#EF4444",
                                    "#F97316",
                                    "#F59E0B",
                                    "#10B981",
                                    "#3B82F6",
                                    "#8B5CF6",
                                    "#EC4899",
                                ].map((color) => (
                                    <div
                                        key={color}
                                        className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                                            newCategoryColor === color
                                                ? "border-white ring-2 ring-black"
                                                : "border-transparent"
                                        }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() =>
                                            setNewCategoryColor(color)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowNewCategoryDialog(false)}
                        >
                            취소
                        </Button>
                        <Button onClick={handleCreateCategory}>
                            카테고리 추가
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 폼 제출 버튼 */}
            <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1">
                    {initialTodo ? "업데이트" : "추가하기"}
                </Button>
                {(initialTodo || onCancel) && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel || resetForm}
                    >
                        취소
                    </Button>
                )}
            </div>
        </form>
    );
}
