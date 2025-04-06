import React, { useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Tag } from './ui/tag';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Todo, Priority, SubTask, TodoNote } from '../db';
import { useTodoStore } from '../store/todoStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Textarea } from './ui/textarea';

interface TodoItemProps {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: number) => void;
  onEdit?: (todo: Todo) => void;
}

export function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
  const { toggleSubtask, addNote, startTimeTracking, stopTimeTracking } = useTodoStore();
  const [noteContent, setNoteContent] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  
  const handleToggle = () => {
    onToggle({
      ...todo,
      completed: !todo.completed,
    });
  };

  const handleDelete = () => {
    if (todo.id !== undefined) {
      onDelete(todo.id);
    }
  };
  
  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    if (todo.id !== undefined) {
      await toggleSubtask(todo.id, subtaskId, completed);
    }
  };
  
  const handleAddNote = async () => {
    if (todo.id !== undefined && noteContent.trim()) {
      await addNote(todo.id, noteContent.trim());
      setNoteContent('');
    }
  };
  
  const handleTimeTracking = async () => {
    if (todo.id === undefined) return;
    
    if (todo.timeTracking?.started && !todo.timeTracking.stopped) {
      // 현재 추적 중인 경우 중단
      await stopTimeTracking(todo.id);
    } else {
      // 추적 시작
      await startTimeTracking(todo.id);
    }
  };

  // 날짜와 시간 포맷팅 함수
  const formatDateTime = (date: Date) => {
    const today = new Date();
    const todoDate = new Date(date);
    
    // 년, 월, 일이 같은지 확인
    const isSameDay = 
      today.getFullYear() === todoDate.getFullYear() &&
      today.getMonth() === todoDate.getMonth() &&
      today.getDate() === todoDate.getDate();
    
    // 시간이 설정되어 있는지 확인 (00:00이 아닌 경우)
    const hasTime = todoDate.getHours() !== 0 || todoDate.getMinutes() !== 0;
    
    if (isSameDay) {
      return hasTime
        ? `오늘 ${format(todoDate, 'HH:mm')}`
        : '오늘';
    }
    
    return hasTime
      ? format(todoDate, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
      : format(todoDate, 'yyyy년 MM월 dd일', { locale: ko });
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
  
  // 우선순위 표시 색상 및 아이콘
  const getPriorityColor = () => {
    switch(todo.priority) {
      case Priority.HIGH:
        return 'text-red-500';
      case Priority.MEDIUM:
        return 'text-amber-500';
      case Priority.LOW:
        return 'text-green-500';
      default:
        return '';
    }
  };
  
  // 우선순위 텍스트
  const getPriorityText = () => {
    switch(todo.priority) {
      case Priority.HIGH:
        return '높음';
      case Priority.MEDIUM:
        return '중간';
      case Priority.LOW:
        return '낮음';
      default:
        return '';
    }
  };
  
  // 시간 추적 포맷팅
  const formatTrackedTime = () => {
    if (!todo.timeTracking?.totalTime) return '00:00:00';
    
    let totalSeconds = Math.floor(todo.timeTracking.totalTime / 1000);
    
    // 현재 추적 중인 경우 추가 시간 계산
    if (todo.timeTracking.started && !todo.timeTracking.stopped) {
      const now = new Date();
      const started = new Date(todo.timeTracking.started);
      const additionalSeconds = Math.floor((now.getTime() - started.getTime()) / 1000);
      totalSeconds += additionalSeconds;
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // 반복 정보 표시
  const getRepeatText = () => {
    if (!todo.repeat) return null;
    
    switch(todo.repeat.type) {
      case 'daily':
        return `매일 반복${todo.repeat.interval && todo.repeat.interval > 1 ? ` (${todo.repeat.interval}일마다)` : ''}`;
      case 'weekly':
        return `매주 반복${todo.repeat.interval && todo.repeat.interval > 1 ? ` (${todo.repeat.interval}주마다)` : ''}`;
      case 'monthly':
        return `매월 반복${todo.repeat.interval && todo.repeat.interval > 1 ? ` (${todo.repeat.interval}개월마다)` : ''}`;
      case 'yearly':
        return `매년 반복${todo.repeat.interval && todo.repeat.interval > 1 ? ` (${todo.repeat.interval}년마다)` : ''}`;
      case 'custom':
        return '사용자 정의 반복';
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`flex flex-col p-3 rounded-md border mb-2 ${todo.priority === Priority.HIGH ? 'border-l-4 border-l-red-500' : ''}`}>
        <div className="flex items-center space-x-4">
          <Checkbox 
            id={`todo-${todo.id}`} 
            checked={todo.completed} 
            onCheckedChange={handleToggle} 
          />
          <div className="flex-1">
            <div className="flex items-center">
              <label 
                htmlFor={`todo-${todo.id}`}
                className={`block text-sm font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}
              >
                {todo.text}
              </label>
              {todo.priority && (
                <span className={`ml-2 text-xs ${getPriorityColor()}`}>
                  ({getPriorityText()})
                </span>
              )}
            </div>
            
            {todo.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {todo.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-x-3 mt-1 text-xs text-muted-foreground">
              {todo.dueDate && (
                <div className="flex items-center">
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
                    className="mr-1"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{formatDateTime(new Date(todo.dueDate))}</span>
                </div>
              )}
              
              {getRepeatText() && (
                <div className="flex items-center">
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
                    className="mr-1"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span>{getRepeatText()}</span>
                </div>
              )}
              
              {todo.subtasks && todo.subtasks.length > 0 && (
                <div className="flex items-center">
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
                    className="mr-1"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  <span>
                    하위작업 {todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length}
                  </span>
                </div>
              )}
              
              {todo.timeTracking && todo.timeTracking.totalTime && (
                <div className="flex items-center">
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
                    className={`mr-1 ${todo.timeTracking.started && !todo.timeTracking.stopped ? 'text-green-500 animate-pulse' : ''}`}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{formatTrackedTime()}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-1">
            {todo.id !== undefined && todo.timeTracking && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleTimeTracking}
                className={todo.timeTracking.started && !todo.timeTracking.stopped ? 'text-green-500' : ''}
              >
                {todo.timeTracking.started && !todo.timeTracking.stopped ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDetails(!showDetails)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </Button>
            
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(todo)}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </Button>
            )}
            
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
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
        
        {/* 태그 표시 영역 */}
        {todo.tags && todo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-8">
            {todo.tags.map((tag, index) => (
              <Tag key={index} variant={getTagColor(tag)} className="text-xs">
                {tag}
              </Tag>
            ))}
          </div>
        )}
        
        {/* 상세 정보 */}
        {showDetails && (
          <div className="ml-8 mt-3 space-y-3 text-sm">
            {/* 하위 작업 */}
            {todo.subtasks && todo.subtasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs">하위 작업</h4>
                <div className="space-y-1">
                  {todo.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center">
                      <Checkbox 
                        id={`subtask-${subtask.id}`} 
                        checked={subtask.completed} 
                        onCheckedChange={(checked) => 
                          handleToggleSubtask(subtask.id, checked === true)
                        }
                        className="mr-2 h-3 w-3" 
                      />
                      <label 
                        htmlFor={`subtask-${subtask.id}`}
                        className={subtask.completed ? 'line-through text-muted-foreground' : ''}
                      >
                        {subtask.text}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 메모 */}
            {todo.notes && todo.notes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs">메모</h4>
                <div className="space-y-2">
                  {todo.notes.map((note) => (
                    <div key={note.id} className="p-2 bg-muted rounded text-xs">
                      <p>{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(note.createdAt), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 메모 추가 */}
            <div className="space-y-2">
              <h4 className="font-medium text-xs">새 메모 추가</h4>
              <div className="flex space-x-2">
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  className="text-xs min-h-[60px]"
                />
              </div>
              <Button 
                size="sm" 
                onClick={handleAddNote}
                disabled={!noteContent.trim()}
              >
                메모 추가
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 팝업 다이얼로그 - 시간 추적 */}
      <Dialog>
        <DialogTrigger asChild>
          
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>시간 추적</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}