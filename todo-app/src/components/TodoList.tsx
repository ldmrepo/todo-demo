import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { TodoItem } from './TodoItem';
import { Tag } from './ui/tag';
import { useTodoStore } from '../store/todoStore';
import { useToast } from '../lib/useToast';
import { Priority } from '../db';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function TodoList() {
  const {
    todos,
    selectedDate,
    selectedTags,
    selectedCategories,
    selectedPriority,
    searchQuery,
    completionFilter,
    categories,
    loadData,
    toggleCompletion,
    deleteTodo,
    setSelectedTodo,
    setEditingTodo,
    setSelectedTags,
    toggleTag,
    setSelectedCategories,
    toggleCategory,
    setSelectedPriority,
    setSearchQuery,
    setCompletionFilter,
    clearFilters,
    getFilteredTodos
  } = useTodoStore();
  
  const { toast } = useToast();
  const [allTags, setAllTags] = useState<string[]>([]);
  
  // 초기 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // 모든 태그 목록 추출
  useEffect(() => {
    const tagSet = new Set<string>();
    todos.forEach(todo => {
      if (todo.tags) {
        todo.tags.forEach(tag => tagSet.add(tag));
      }
    });
    setAllTags(Array.from(tagSet));
  }, [todos]);
  
  // 필터링된 할 일 가져오기
  const filteredTodos = getFilteredTodos();
  
  const handleToggleTodo = async (todo: React.SetStateAction<any>) => {
    try {
      // @ts-ignore
      await toggleCompletion(todo.id, !todo.completed);
    } catch (error) {
      console.error('Error updating todo:', error);
      toast({
        title: '오류',
        description: '할 일을 업데이트하는 데 실패했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await deleteTodo(id);
      toast({
        title: '성공',
        description: '할 일이 삭제되었습니다',
      });
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast({
        title: '오류',
        description: '할 일을 삭제하는 데 실패했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleEditTodo = (todo: React.SetStateAction<any>) => {
    setEditingTodo(todo);
  };
  
  // 태그 색상 선택
  const getTagColor = (tag: string) => {
    const colors = ['default', 'secondary', 'success', 'info', 'warning'];
    const hash = tag.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length] as 
      'default' | 'secondary' | 'success' | 'info' | 'warning';
  };
  
  // 카테고리 색상 가져오기
  const getCategoryColor = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category ? category.color : '#9CA3AF';
  };
  
  // 카테고리 이름 가져오기
  const getCategoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category ? category.name : '카테고리 없음';
  };

  return (
    <div className="space-y-6">
      {/* 검색 및 필터링 영역 */}
      <div className="space-y-4">
        <Input
          placeholder="할 일 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        
        <div className="flex flex-wrap gap-2">
          {/* 완료 상태 필터 */}
          <Select value={completionFilter} onValueChange={(value) => setCompletionFilter(value as 'all' | 'completed' | 'active')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="완료 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 항목</SelectItem>
              <SelectItem value="active">미완료</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
            </SelectContent>
          </Select>
          
          {/* 우선순위 필터 */}
          <Select 
            value={selectedPriority || '_all'} 
            onValueChange={(value) => setSelectedPriority(value === '_all' ? null : value as Priority)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="우선순위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">모든 우선순위</SelectItem>
              <SelectItem value={Priority.HIGH}>높음</SelectItem>
              <SelectItem value={Priority.MEDIUM}>중간</SelectItem>
              <SelectItem value={Priority.LOW}>낮음</SelectItem>
            </SelectContent>
          </Select>
          
          {/* 카테고리 필터 링크 */}
          {categories.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedCategories([])}
              className={selectedCategories.length > 0 ? 'bg-muted' : ''}
            >
              {selectedCategories.length > 0
                ? `${selectedCategories.length}개 카테고리 필터링 중`
                : '카테고리 필터'}
            </Button>
          )}
          
          {/* 필터 초기화 버튼 */}
          {(selectedTags.length > 0 || selectedCategories.length > 0 || selectedPriority || searchQuery || completionFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="ml-auto">
              필터 초기화
            </Button>
          )}
        </div>
        
        {/* 태그 필터 영역 */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">태그</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Tag
                  key={tag}
                  variant={selectedTags.includes(tag) ? getTagColor(tag) : 'outline'}
                  className={`cursor-pointer ${selectedTags.includes(tag) ? '' : 'opacity-70'}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {/* 카테고리 필터 영역 (선택된 경우만 표시) */}
        {selectedCategories.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">선택된 카테고리</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map(catId => (
                <div 
                  key={catId}
                  className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs cursor-pointer bg-background border"
                  onClick={() => toggleCategory(catId)}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(catId) }} 
                  />
                  <span>{getCategoryName(catId)}</span>
                  <button className="ml-1">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* 할 일 목록 */}
      <div className="space-y-1">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery || selectedTags.length > 0 || selectedCategories.length > 0 || selectedPriority || completionFilter !== 'all'
                ? '필터와 일치하는 할 일이 없습니다.'
                : '아직 할 일이 없습니다. 새 할 일을 추가해보세요!'}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-3 text-sm text-muted-foreground">
              총 {filteredTodos.length}개의 할 일
            </div>
            {filteredTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
                onEdit={handleEditTodo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}