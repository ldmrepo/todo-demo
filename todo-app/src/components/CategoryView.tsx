import { useEffect, useState } from "react";
import { Category } from "../db";
import { useTodoStore } from "../store/todoStore";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

export function CategoryView() {
    const {
        categories,
        loadData,
        addCategory,
        updateCategory,
        deleteCategory,
        setSelectedCategories,
        toggleCategory,
        selectedCategories,
    } = useTodoStore();

    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // 색상 팔레트
    const colorPalette = [
        "#EF4444", // 빨강
        "#F97316", // 주황
        "#F59E0B", // 노랑
        "#10B981", // 초록
        "#3B82F6", // 파랑
        "#8B5CF6", // 보라
        "#EC4899", // 핑크
        "#6B7280", // 회색
    ];

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            await addCategory({
                name: newCategoryName.trim(),
                color: newCategoryColor,
            });

            // 폼 초기화
            setNewCategoryName("");
            setNewCategoryColor("#3B82F6");
            setShowNewDialog(false);
        } catch (error) {
            console.error("Error creating category:", error);
        }
    };

    const handleOpenEditDialog = (category: Category) => {
        setEditCategory(category);
        setShowEditDialog(true);
    };

    const handleUpdateCategory = async () => {
        if (!editCategory) return;

        try {
            await updateCategory(editCategory);
            setShowEditDialog(false);
            setEditCategory(null);
        } catch (error) {
            console.error("Error updating category:", error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        try {
            await deleteCategory(id);
            setConfirmDelete(null);
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    // 계층 구조 카테고리 목록 만들기
    const buildCategoryTree = (
        items: Category[],
        parentId?: string
    ): Category[] => {
        return items
            .filter((item) => item.parentId === parentId)
            .map((item) => ({
                ...item,
                children: buildCategoryTree(items, item.id),
            }));
    };

    const categoryTree = buildCategoryTree(categories);

    // 카테고리 항목 렌더링 (재귀적)
    const renderCategoryItem = (
        category: Category & { children?: Category[] },
        depth = 0
    ) => {
        const isSelected = selectedCategories.includes(category.id);

        return (
            <div key={category.id} className="mt-1">
                <div
                    className={`flex items-center justify-between p-2 rounded-md ${
                        isSelected ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                >
                    <div
                        className="flex items-center flex-1"
                        onClick={() => toggleCategory(category.id)}
                    >
                        <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                    </div>
                    <div className="flex space-x-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDialog(category)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(category.id)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </Button>
                    </div>
                </div>

                {/* 하위 카테고리 재귀적으로 렌더링 */}
                {category.children && category.children.length > 0 && (
                    <div>
                        {category.children.map((child) =>
                            renderCategoryItem(child, depth + 1)
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">카테고리</h2>
                <Button onClick={() => setShowNewDialog(true)}>
                    새 카테고리
                </Button>
            </div>

            {/* 카테고리 목록 */}
            <div className="space-y-2">
                {categories.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                            등록된 카테고리가 없습니다. 새 카테고리를
                            생성해보세요!
                        </p>
                        <Button onClick={() => setShowNewDialog(true)}>
                            카테고리 생성하기
                        </Button>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium">
                                카테고리 목록
                            </h3>
                            {selectedCategories.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedCategories([])}
                                >
                                    필터 해제
                                </Button>
                            )}
                        </div>
                        <div className="border rounded-md p-1">
                            {categoryTree.map((category) =>
                                renderCategoryItem(category)
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 새 카테고리 다이얼로그 */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>새 카테고리 추가</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">색상</label>
                            <div className="grid grid-cols-8 gap-2">
                                {colorPalette.map((color) => (
                                    <div
                                        key={color}
                                        className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                                            newCategoryColor === color
                                                ? "border-black"
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                상위 카테고리 (선택사항)
                            </label>
                            <select
                                className="w-full p-2 border rounded-md"
                                onChange={(e) => {
                                    const parentId =
                                        e.target.value || undefined;
                                    setNewCategoryName((prevName) => prevName);
                                }}
                            >
                                <option value="">상위 카테고리 없음</option>
                                {categories.map((category) => (
                                    <option
                                        key={category.id}
                                        value={category.id}
                                    >
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowNewDialog(false)}
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim()}
                        >
                            추가하기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 카테고리 편집 다이얼로그 */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>카테고리 수정</DialogTitle>
                    </DialogHeader>
                    {editCategory && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    카테고리 이름
                                </label>
                                <Input
                                    value={editCategory.name}
                                    onChange={(e) =>
                                        setEditCategory({
                                            ...editCategory,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="카테고리 이름 입력"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    색상
                                </label>
                                <div className="grid grid-cols-8 gap-2">
                                    {colorPalette.map((color) => (
                                        <div
                                            key={color}
                                            className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                                                editCategory.color === color
                                                    ? "border-black"
                                                    : "border-transparent"
                                            }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() =>
                                                setEditCategory({
                                                    ...editCategory,
                                                    color,
                                                })
                                            }
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    상위 카테고리 (선택사항)
                                </label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={editCategory.parentId || ""}
                                    onChange={(e) => {
                                        const parentId =
                                            e.target.value || undefined;
                                        setEditCategory({
                                            ...editCategory,
                                            parentId,
                                        });
                                    }}
                                >
                                    <option value="">상위 카테고리 없음</option>
                                    {categories
                                        .filter(
                                            (category) =>
                                                category.id !== editCategory.id
                                        ) // 자기 자신은 제외
                                        .map((category) => (
                                            <option
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowEditDialog(false)}
                        >
                            취소
                        </Button>
                        <Button onClick={handleUpdateCategory}>저장하기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 삭제 확인 다이얼로그 */}
            {confirmDelete && (
                <Dialog
                    open={!!confirmDelete}
                    onOpenChange={(open) => !open && setConfirmDelete(null)}
                >
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>카테고리 삭제</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p>
                                이 카테고리를 삭제하시겠습니까? 이 작업은 되돌릴
                                수 없습니다.
                            </p>
                            <p className="text-muted-foreground text-sm mt-2">
                                * 이 카테고리에 속한 할 일들은 카테고리 없는
                                상태로 변경됩니다.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setConfirmDelete(null)}
                            >
                                취소
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() =>
                                    confirmDelete &&
                                    handleDeleteCategory(confirmDelete)
                                }
                            >
                                삭제
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
