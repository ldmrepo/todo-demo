import React, { useState, useEffect } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfDay,
  addDays,
  addHours,
  addMinutes,
  getHours,
  getMinutes,
  isWithinInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from './ui/button';
import { useTodoStore } from '../store/todoStore';
import { Todo, Priority } from '../db';
import { useToast } from '../lib/useToast';

// 일주일의 요일 헤더
const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

// 시간 슬롯 (30분 간격)
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  return { hour, minute };
});

export function CalendarView() {
  const { 
    todos,
    loadData, 
    calendarViewType,
    setCalendarViewType,
    selectedDate,
    setSelectedDate,
    setEditingTodo
  } = useTodoStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const { toast } = useToast();
  
  // 초기 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // 현재 날짜가 변경되면 월/주 변경
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(startOfMonth(selectedDate));
      setCurrentWeek(startOfWeek(selectedDate, { weekStartsOn: 0 }));
    }
  }, [selectedDate]);
  
  // 현재 뷰에 따른 날짜 범위 계산
  const getDaysInRange = () => {
    if (calendarViewType === 'month') {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
      
      return eachDayOfInterval({ start: startDate, end: endDate });
    } else if (calendarViewType === 'week') {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else { // day view
      return [selectedDate || new Date()];
    }
  };
  
  // 이전 달/주/일로 이동
  const handlePrevious = () => {
    if (calendarViewType === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else if (calendarViewType === 'week') {
      setCurrentWeek(addDays(currentWeek, -7));
    } else { // day view
      setSelectedDate(addDays(selectedDate || new Date(), -1));
    }
  };
  
  // 다음 달/주/일로 이동
  const handleNext = () => {
    if (calendarViewType === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else if (calendarViewType === 'week') {
      setCurrentWeek(addDays(currentWeek, 7));
    } else { // day view
      setSelectedDate(addDays(selectedDate || new Date(), 1));
    }
  };
  
  // 오늘로 이동
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(startOfMonth(today));
    setCurrentWeek(startOfWeek(today, { weekStartsOn: 0 }));
  };
  
  // 특정 날짜의 할 일 가져오기
  const getTodosForDay = (day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    
    return todos.filter(todo => {
      if (!todo.dueDate) return false;
      
      const dueDate = new Date(todo.dueDate);
      
      // 시간이 있는 경우(00:00이 아닌 경우)
      if (getHours(dueDate) !== 0 || getMinutes(dueDate) !== 0) {
        return isWithinInterval(dueDate, { start: dayStart, end: dayEnd });
      }
      
      // 시간이 없는 경우 날짜만 비교
      return isSameDay(dueDate, day);
    });
  };
  
  // 날짜 클릭 처리
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };
  
  // 할 일 클릭 처리
  const handleTodoClick = (todo: Todo) => {
    setEditingTodo(todo);
  };
  
  // 할 일 렌더링 - 월간 뷰
  const renderTodoMonthView = (day: Date) => {
    const dayTodos = getTodosForDay(day);
    const MAX_DISPLAY = 3; // 최대 표시 할 일 수
    
    if (dayTodos.length === 0) return null;
    
    return (
      <div className="mt-1 overflow-y-auto max-h-[80px]">
        {dayTodos.slice(0, MAX_DISPLAY).map((todo, index) => (
          <div 
            key={index}
            className={`text-xs p-1 mb-1 rounded truncate cursor-pointer
              ${todo.completed ? 'line-through text-muted-foreground' : ''}
              ${todo.priority === Priority.HIGH ? 'bg-red-100 text-red-800' : 
                todo.priority === Priority.MEDIUM ? 'bg-amber-100 text-amber-800' : 
                'bg-blue-100 text-blue-800'}`}
            onClick={() => handleTodoClick(todo)}
          >
            {getHours(new Date(todo.dueDate as Date)) !== 0 && (
              <span className="inline-block mr-1 font-medium">
                {format(new Date(todo.dueDate as Date), 'HH:mm')}
              </span>
            )}
            {todo.text}
          </div>
        ))}
        {dayTodos.length > MAX_DISPLAY && (
          <div className="text-xs text-muted-foreground text-center">
            +{dayTodos.length - MAX_DISPLAY}개 더보기
          </div>
        )}
      </div>
    );
  };
  
  // 시간대별 할 일 가져오기
  const getTodosForTimeSlot = (day: Date, hour: number, minute: number) => {
    const slotStart = addMinutes(addHours(startOfDay(day), hour), minute);
    const slotEnd = addMinutes(slotStart, 30);
    
    return todos.filter(todo => {
      if (!todo.dueDate) return false;
      
      const dueDate = new Date(todo.dueDate);
      const dueHour = getHours(dueDate);
      const dueMinute = getMinutes(dueDate);
      
      // 0시 0분인 경우(시간 없는 경우)는 제외
      if (dueHour === 0 && dueMinute === 0) return false;
      
      // 같은 날짜이고 시간대가 일치하는지 확인
      return isSameDay(dueDate, day) && 
        dueHour === hour && 
        (minute === 0 ? dueMinute < 30 : dueMinute >= 30);
    });
  };
  
  // 현재 시간 라인 위치 계산 (주간/일간 뷰용)
  const calculateCurrentTimePosition = () => {
    const now = new Date();
    const hours = getHours(now);
    const minutes = getMinutes(now);
    
    // 전체 높이에서 현재 시간의 비율 계산 (시간 * 2 + 분 / 30)
    return (hours * 60 + minutes) / (24 * 60) * 100;
  };
  
  // 월간 뷰 렌더링
  const renderMonthView = () => {
    const days = getDaysInRange();
    const today = new Date();
    
    return (
      <div className="grid grid-cols-7 gap-px bg-muted">
        {/* 요일 헤더 */}
        {DAYS_OF_WEEK.map((day, index) => (
          <div 
            key={index} 
            className="p-2 text-center text-sm font-medium bg-background"
          >
            {day}
          </div>
        ))}
        
        {/* 날짜 셀 */}
        {days.map((day, index) => {
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          
          return (
            <div 
              key={index}
              className={`min-h-[100px] p-1 bg-background border-b border-r
                ${!inMonth ? 'text-muted-foreground' : ''}
                ${isToday ? 'bg-blue-50' : ''}
                ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              <div className="flex justify-between items-center">
                <span className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </span>
                {isToday && (
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                )}
              </div>
              
              {/* 해당 날짜의 할 일 목록 */}
              {renderTodoMonthView(day)}
            </div>
          );
        })}
      </div>
    );
  };
  
  // 주간 뷰 렌더링
  const renderWeekView = () => {
    const days = getDaysInRange();
    const today = new Date();
    const currentTimePos = calculateCurrentTimePosition();
    
    return (
      <div className="flex flex-col h-[800px]">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-8 gap-px bg-muted">
          <div className="p-2 text-center text-sm font-medium bg-background">시간</div>
          {days.map((day, index) => {
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            
            return (
              <div 
                key={index} 
                className={`p-2 text-center text-sm font-medium bg-background cursor-pointer
                  ${isToday ? 'text-blue-600 font-bold' : ''}
                  ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                {format(day, 'E d', { locale: ko })}
              </div>
            );
          })}
        </div>
        
        {/* 시간 그리드 */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="grid grid-cols-8 gap-px bg-muted">
            {/* 시간 레이블 */}
            <div className="bg-background">
              {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((slot, index) => (
                <div key={index} className="h-[60px] border-b pr-2 text-right text-sm text-muted-foreground">
                  {slot.hour}:00
                </div>
              ))}
            </div>
            
            {/* 각 요일의 시간 셀 */}
            {days.map((day, dayIndex) => {
              const isToday = isSameDay(day, today);
              
              return (
                <div key={dayIndex} className={`relative ${isToday ? 'bg-blue-50' : 'bg-background'}`}>
                  {TIME_SLOTS.map((slot, slotIndex) => {
                    const todos = getTodosForTimeSlot(day, slot.hour, slot.minute);
                    
                    return (
                      <div 
                        key={slotIndex} 
                        className={`h-[30px] border-b ${slot.minute === 0 ? 'border-muted' : 'border-dashed border-muted/50'}`}
                      >
                        {todos.map((todo, todoIndex) => (
                          <div 
                            key={todoIndex}
                            className={`absolute z-10 left-0 right-0 mx-1 p-1 text-xs rounded truncate cursor-pointer
                              ${todo.completed ? 'line-through text-muted-foreground' : ''}
                              ${todo.priority === Priority.HIGH ? 'bg-red-100 text-red-800' : 
                                todo.priority === Priority.MEDIUM ? 'bg-amber-100 text-amber-800' : 
                                'bg-blue-100 text-blue-800'}`}
                            style={{ top: `${slotIndex * 30}px` }}
                            onClick={() => handleTodoClick(todo)}
                          >
                            {format(new Date(todo.dueDate as Date), 'HH:mm')} {todo.text}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  
                  {/* 현재 시간 표시 라인 */}
                  {isToday && (
                    <div 
                      className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                      style={{ top: `${currentTimePos}%` }}
                    >
                      <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  // 일간 뷰 렌더링
  const renderDayView = () => {
    const day = selectedDate || new Date();
    const isToday = isSameDay(day, new Date());
    const currentTimePos = calculateCurrentTimePosition();
    
    return (
      <div className="flex flex-col h-[800px]">
        {/* 시간 그리드 */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="grid grid-cols-[80px_1fr] gap-px bg-muted">
            {/* 시간 레이블 */}
            <div className="bg-background">
              {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((slot, index) => (
                <div key={index} className="h-[60px] border-b pr-2 text-right text-sm text-muted-foreground">
                  {slot.hour}:00
                </div>
              ))}
            </div>
            
            {/* 시간 셀 */}
            <div className={`relative ${isToday ? 'bg-blue-50' : 'bg-background'}`}>
              {TIME_SLOTS.map((slot, slotIndex) => {
                const todos = getTodosForTimeSlot(day, slot.hour, slot.minute);
                
                return (
                  <div 
                    key={slotIndex} 
                    className={`h-[30px] border-b ${slot.minute === 0 ? 'border-muted' : 'border-dashed border-muted/50'}`}
                  >
                    {todos.map((todo, todoIndex) => (
                      <div 
                        key={todoIndex}
                        className={`absolute z-10 left-0 right-0 mx-1 p-1 text-xs rounded truncate cursor-pointer
                          ${todo.completed ? 'line-through text-muted-foreground' : ''}
                          ${todo.priority === Priority.HIGH ? 'bg-red-100 text-red-800' : 
                            todo.priority === Priority.MEDIUM ? 'bg-amber-100 text-amber-800' : 
                            'bg-blue-100 text-blue-800'}`}
                        style={{ top: `${slotIndex * 30}px` }}
                        onClick={() => handleTodoClick(todo)}
                      >
                        {format(new Date(todo.dueDate as Date), 'HH:mm')} {todo.text}
                      </div>
                    ))}
                  </div>
                );
              })}
              
              {/* 현재 시간 표시 라인 */}
              {isToday && (
                <div 
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                  style={{ top: `${currentTimePos}%` }}
                >
                  <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500"></div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 하루 전체 할 일 (시간 없음) */}
        <div className="mt-4 p-2 border-t">
          <h3 className="text-sm font-medium mb-2">종일 일정</h3>
          <div className="space-y-1">
            {getTodosForDay(day)
              .filter(todo => {
                const dueDate = new Date(todo.dueDate as Date);
                return getHours(dueDate) === 0 && getMinutes(dueDate) === 0;
              })
              .map((todo, index) => (
                <div 
                  key={index}
                  className={`p-2 text-sm rounded cursor-pointer
                    ${todo.completed ? 'line-through text-muted-foreground' : ''}
                    ${todo.priority === Priority.HIGH ? 'bg-red-100 text-red-800' : 
                      todo.priority === Priority.MEDIUM ? 'bg-amber-100 text-amber-800' : 
                      'bg-blue-100 text-blue-800'}`}
                  onClick={() => handleTodoClick(todo)}
                >
                  {todo.text}
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 캘린더 컨트롤 */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={handlePrevious}>
            <span className="sr-only">이전</span>
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Button>
          <Button size="sm" variant="outline" onClick={handleNext}>
            <span className="sr-only">다음</span>
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
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
          <Button size="sm" variant="outline" onClick={goToToday}>오늘</Button>
        </div>
        
        <h2 className="text-xl font-semibold">
          {calendarViewType === 'month' && format(currentMonth, 'yyyy년 M월', { locale: ko })}
          {calendarViewType === 'week' && `${format(currentWeek, 'yyyy년 M월 d일', { locale: ko })} - ${format(addDays(currentWeek, 6), 'M월 d일', { locale: ko })}`}
          {calendarViewType === 'day' && format(selectedDate || new Date(), 'yyyy년 M월 d일 (E)', { locale: ko })}
        </h2>
        
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant={calendarViewType === 'month' ? 'default' : 'outline'} 
            onClick={() => setCalendarViewType('month')}
          >
            월
          </Button>
          <Button 
            size="sm" 
            variant={calendarViewType === 'week' ? 'default' : 'outline'} 
            onClick={() => setCalendarViewType('week')}
          >
            주
          </Button>
          <Button 
            size="sm" 
            variant={calendarViewType === 'day' ? 'default' : 'outline'} 
            onClick={() => setCalendarViewType('day')}
          >
            일
          </Button>
        </div>
      </div>
      
      {/* 캘린더 뷰 */}
      <div className="border rounded-lg overflow-hidden">
        {calendarViewType === 'month' && renderMonthView()}
        {calendarViewType === 'week' && renderWeekView()}
        {calendarViewType === 'day' && renderDayView()}
      </div>
    </div>
  );
}