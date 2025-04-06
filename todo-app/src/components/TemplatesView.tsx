import React, { useState, useEffect } from 'react';
import { TodoTemplate, Todo, Priority } from '../db';
import { useTodoStore } from '../store/todoStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { TodoForm } from './TodoForm';

export function TemplatesView() {
  const { 
    templates, 
    loadData, 
    addTemplate, 
    updateTemplate, 
    deleteTemplate,
    createFromTemplate
  } = useTodoStore();
  
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TodoTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    
    try {
      const todoData: Omit<Todo, 'id' | 'createdAt' | 'completedAt'> = {
        text: '',
        description: '',
        completed: false,
        tags: [],
        priority: Priority.MEDIUM,
        subtasks: [],
        notes: []
      };
      
      await addTemplate({
        name: newTemplateName.trim(),
        description: newTemplateDescription.trim() || undefined,
        todoData
      });
      
      // 폼 초기화
      setNewTemplateName('');
      setNewTemplateDescription('');
      setShowNewDialog(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };
  
  const handleOpenEditDialog = (template: TodoTemplate) => {
    setSelectedTemplate(template);
    setShowEditDialog(true);
  };
  
  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      await updateTemplate(selectedTemplate);
      setShowEditDialog(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };
  
  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id);
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };
  
  const handleUseTemplate = async (templateId: string) => {
    try {
      await createFromTemplate(templateId);
    } catch (error) {
      console.error('Error creating todo from template:', error);
    }
  };
  
  const getPriorityText = (priority: Priority) => {
    switch(priority) {
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
  
  const getPriorityColor = (priority: Priority) => {
    switch(priority) {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">템플릿</h2>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>새 템플릿</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>새 템플릿 생성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">템플릿 이름</label>
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="템플릿 이름 입력"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">설명 (선택사항)</label>
                <Textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="템플릿에 대한 설명 입력"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>취소</Button>
              <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
                생성하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {templates.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-4">
            등록된 템플릿이 없습니다. 새 템플릿을 생성해보세요!
          </div>
          <Button onClick={() => setShowNewDialog(true)}>템플릿 생성하기</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4 bg-background">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleOpenEditDialog(template)}
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
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setConfirmDelete(template.id)}
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
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </Button>
                </div>
              </div>
              
              {/* 템플릿 미리보기 */}
              <div className="mt-4 border-t pt-3">
                <div className="flex items-center text-sm mb-2">
                  <span className="font-medium">할 일:</span>
                  <span className="ml-2">
                    {template.todoData.text || '(제목 없음)'}
                  </span>
                </div>
                
                {template.todoData.description && (
                  <div className="text-sm mb-2 line-clamp-2">
                    <span className="font-medium">설명:</span>
                    <span className="ml-2">{template.todoData.description}</span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-2">
                  {template.todoData.priority && (
                    <div className="flex items-center">
                      <span className={getPriorityColor(template.todoData.priority)}>
                        우선순위: {getPriorityText(template.todoData.priority)}
                      </span>
                    </div>
                  )}
                  
                  {template.todoData.tags && template.todoData.tags.length > 0 && (
                    <div className="flex items-center">
                      <span>태그: {template.todoData.tags.join(', ')}</span>
                    </div>
                  )}
                  
                  {template.todoData.subtasks && template.todoData.subtasks.length > 0 && (
                    <div className="flex items-center">
                      <span>하위작업: {template.todoData.subtasks.length}개</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleUseTemplate(template.id)}
                >
                  이 템플릿으로 할 일 생성
                </Button>
              </div>
              
              {/* 삭제 확인 다이얼로그 */}
              <Dialog open={confirmDelete === template.id} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>템플릿 삭제</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p>"{template.name}" 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmDelete(null)}>취소</Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      삭제
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </div>
      )}
      
      {/* 템플릿 편집 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>템플릿 수정</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">템플릿 이름</label>
                <Input
                  value={selectedTemplate.name}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    name: e.target.value
                  })}
                  placeholder="템플릿 이름 입력"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">설명 (선택사항)</label>
                <Textarea
                  value={selectedTemplate.description || ''}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    description: e.target.value || undefined
                  })}
                  placeholder="템플릿에 대한 설명 입력"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">할 일 템플릿 설정</label>
                <div className="border rounded-md p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">제목</label>
                    <Input
                      value={selectedTemplate.todoData.text}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        todoData: {
                          ...selectedTemplate.todoData,
                          text: e.target.value
                        }
                      })}
                      placeholder="할 일 제목 입력"
                    />
                  </div>
                  <div className="space-y-2 mt-3">
                    <label className="text-sm font-medium">설명</label>
                    <Textarea
                      value={selectedTemplate.todoData.description || ''}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        todoData: {
                          ...selectedTemplate.todoData,
                          description: e.target.value || undefined
                        }
                      })}
                      placeholder="할 일 설명 입력"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2 mt-3">
                    <label className="text-sm font-medium">우선순위</label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={selectedTemplate.todoData.priority === Priority.LOW ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTemplate({
                          ...selectedTemplate,
                          todoData: {
                            ...selectedTemplate.todoData,
                            priority: Priority.LOW
                          }
                        })}
                        className="flex-1"
                      >
                        낮음
                      </Button>
                      <Button
                        type="button"
                        variant={selectedTemplate.todoData.priority === Priority.MEDIUM ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTemplate({
                          ...selectedTemplate,
                          todoData: {
                            ...selectedTemplate.todoData,
                            priority: Priority.MEDIUM
                          }
                        })}
                        className="flex-1"
                      >
                        중간
                      </Button>
                      <Button
                        type="button"
                        variant={selectedTemplate.todoData.priority === Priority.HIGH ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTemplate({
                          ...selectedTemplate,
                          todoData: {
                            ...selectedTemplate.todoData,
                            priority: Priority.HIGH
                          }
                        })}
                        className="flex-1"
                      >
                        높음
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>취소</Button>
            <Button onClick={handleUpdateTemplate}>
              저장하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}