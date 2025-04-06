import { useState, useEffect } from 'react';
import { TodoList } from './components/TodoList';
import { CalendarView } from './components/CalendarView';
import { SettingsDialog } from './components/SettingsDialog';
import { CategoryView } from './components/CategoryView';
import { StatisticsView } from './components/StatisticsView';
import { TemplatesView } from './components/TemplatesView';
import { TodoForm } from './components/TodoForm';
import { Toaster } from './components/ui/toaster';
import { Button } from './components/ui/button';
import { useTodoStore } from './store/todoStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';

// 다양한 뷰를 위한 타입
type ViewType = 'list' | 'calendar' | 'statistics' | 'categories' | 'templates';

function App() {
  const { 
    activeView, 
    setActiveView, 
    calendarViewType, 
    loadData, 
    settings,
    editingTodo,
    setEditingTodo
  } = useTodoStore();
  
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [showNewTodoDialog, setShowNewTodoDialog] = useState(false);
  
  // 초기 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // 데이터베이스 초기화 후 UI 새로고침
  const handleDatabaseReset = () => {
    // refreshKey를 변경하여 자식 컴포넌트 다시 마운트
    setRefreshKey(prev => prev + 1);
    loadData();
  };
  
  // 새 할 일 추가 완료 처리
  const handleNewTodoSubmit = () => {
    setShowNewTodoDialog(false);
    loadData();
  };
  
  // 할 일 편집 완료 처리
  const handleEditTodoSubmit = () => {
    setEditingTodo(null);
    loadData();
  };
  
  // 할 일 편집 취소
  const handleEditTodoCancel = () => {
    setEditingTodo(null);
  };

  // 현재 활성 탭에 따른 컴포넌트 렌더링
  const renderActiveView = () => {
    switch (activeView) {
      case 'list':
        return (
          <div className="max-w-3xl mx-auto" key={`list-${refreshKey}`}>
            <TodoList />
          </div>
        );
      case 'calendar':
        return (
          <div key={`calendar-${refreshKey}`}>
            <CalendarView />
          </div>
        );
      case 'statistics':
        return (
          <div className="max-w-4xl mx-auto" key={`stats-${refreshKey}`}>
            <StatisticsView />
          </div>
        );
      case 'categories':
        return (
          <div className="max-w-3xl mx-auto" key={`categories-${refreshKey}`}>
            <CategoryView />
          </div>
        );
      case 'templates':
        return (
          <div className="max-w-3xl mx-auto" key={`templates-${refreshKey}`}>
            <TemplatesView />
          </div>
        );
      default:
        return <TodoList />;
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-8 pb-16 px-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">Todo Calendar</h1>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowNewTodoDialog(true)}>새 할 일</Button>
            <SettingsDialog onDatabaseReset={handleDatabaseReset} />
          </div>
        </div>
        
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="flex justify-center space-x-2 min-w-max">
            <Button 
              variant={activeView === 'list' ? 'default' : 'outline'} 
              onClick={() => setActiveView('list')}
              className="min-w-[100px]"
            >
              할 일 목록
            </Button>
            <Button 
              variant={activeView === 'calendar' ? 'default' : 'outline'} 
              onClick={() => setActiveView('calendar')}
              className="min-w-[100px]"
            >
              캘린더
            </Button>
            <Button 
              variant={activeView === 'categories' ? 'default' : 'outline'} 
              onClick={() => setActiveView('categories')}
              className="min-w-[100px]"
            >
              카테고리
            </Button>
            <Button 
              variant={activeView === 'templates' ? 'default' : 'outline'} 
              onClick={() => setActiveView('templates')}
              className="min-w-[100px]"
            >
              템플릿
            </Button>
            <Button 
              variant={activeView === 'statistics' ? 'default' : 'outline'} 
              onClick={() => setActiveView('statistics')}
              className="min-w-[100px]"
            >
              통계
            </Button>
          </div>
        </div>
        
        {/* 활성 뷰 렌더링 */}
        <div>
          {renderActiveView()}
        </div>
      </div>
      
      {/* 새 할 일 다이얼로그 */}
      <Dialog open={showNewTodoDialog} onOpenChange={setShowNewTodoDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>새 할 일 추가</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TodoForm onSubmit={handleNewTodoSubmit} onCancel={() => setShowNewTodoDialog(false)} />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 할 일 편집 다이얼로그 */}
      <Dialog open={editingTodo !== null} onOpenChange={(open) => !open && setEditingTodo(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>할 일 수정</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TodoForm 
              initialTodo={editingTodo} 
              onSubmit={handleEditTodoSubmit} 
              onCancel={handleEditTodoCancel} 
            />
          </div>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
}

export default App;