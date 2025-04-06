import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from './ui/dialog';
import { Button } from './ui/button';
import { resetDatabase, deleteAllTodos } from '../db';
import { useToast } from '../lib/useToast';

interface SettingsDialogProps {
  onDatabaseReset: () => void;
}

export function SettingsDialog({ onDatabaseReset }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  // 모든 할 일만 삭제 (DB 스키마는 유지)
  const handleClearTodos = async () => {
    setIsResetting(true);
    
    try {
      const success = await deleteAllTodos();
      
      if (success) {
        toast({
          title: '성공',
          description: '모든 할 일이 삭제되었습니다.',
        });
        
        // 부모 컴포넌트에 초기화 완료 알림
        onDatabaseReset();
        setIsOpen(false);
      } else {
        toast({
          title: '오류',
          description: '할 일 삭제 중 문제가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('할 일 삭제 오류:', error);
      toast({
        title: '오류',
        description: '작업 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  // 전체 데이터베이스 초기화 (DB 삭제 후 재생성)
  const handleResetDatabase = async () => {
    setIsResetting(true);
    
    try {
      const success = await resetDatabase();
      
      if (success) {
        toast({
          title: '성공',
          description: '데이터베이스가 초기화되었습니다.',
        });
        
        // 부모 컴포넌트에 초기화 완료 알림
        onDatabaseReset();
        setIsOpen(false);
      } else {
        toast({
          title: '오류',
          description: '데이터베이스 초기화 중 문제가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('데이터베이스 초기화 오류:', error);
      toast({
        title: '오류',
        description: '작업 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          설정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
          <DialogDescription>
            앱 설정을 관리하고 데이터를 초기화할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">데이터 관리</h3>
            <p className="text-sm text-muted-foreground">
              데이터를 초기화하면 복구할 수 없습니다. 신중하게 선택하세요.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={handleClearTodos} 
              className="w-full justify-start"
              disabled={isResetting}
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
                className="mr-2"
              >
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              모든 할 일 삭제
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={handleResetDatabase} 
              className="w-full justify-start"
              disabled={isResetting}
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
                className="mr-2"
              >
                <path d="M3 2v6h6"></path>
                <path d="M21 12A9 9 0 0 0 3.86 5.14"></path>
                <path d="M21 22v-6h-6"></path>
                <path d="M3 12a9 9 0 0 0 17.14 6.86"></path>
              </svg>
              데이터베이스 초기화
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}