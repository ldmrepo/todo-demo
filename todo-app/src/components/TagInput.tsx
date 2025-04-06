import React, { useState, useRef, useEffect } from 'react';
import { Tag } from './ui/tag';
import { Input } from './ui/input';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
}

export function TagInput({
  tags,
  onTagsChange,
  placeholder = '태그 입력 후 Enter',
  disabled = false,
  maxTags = 10,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 태그 목록의 변경사항을 부모 컴포넌트에 알림
  useEffect(() => {
    onTagsChange(tags);
  }, [tags, onTagsChange]);

  // 새 태그 추가
  const handleAddTag = (tag: string) => {
    // 빈 문자열이거나 이미 존재하는 태그는 추가하지 않음
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag) || tags.length >= maxTags) {
      return;
    }

    onTagsChange([...tags, trimmedTag]);
    setInputValue('');
  };

  // 태그 삭제
  const handleRemoveTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    onTagsChange(newTags);
  };

  // 키보드 입력 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags.length - 1);
    }
  };

  // 붙여넣기 처리 (여러 태그를 콤마로 구분하여 한 번에 추가)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    // 콤마로 구분된 문자열을 태그 배열로 변환
    const pastedTags = pasteData
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && !tags.includes(tag));

    // 최대 태그 수를 초과하지 않도록 처리
    const newTags = [...tags, ...pastedTags].slice(0, maxTags);
    
    if (pastedTags.length > 0) {
      e.preventDefault();
      onTagsChange(newTags);
      setInputValue('');
    }
  };

  // 다양한 색상의 태그 표시
  const getTagColor = (tag: string) => {
    const colors = ['default', 'secondary', 'success', 'info', 'warning'];
    // 태그 이름에 따라 일관된 색상 선택 (해시 함수 활용)
    const hash = tag.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length] as 
      'default' | 'secondary' | 'success' | 'info' | 'warning';
  };

  return (
    <div className="border rounded-md p-2 flex flex-wrap gap-2 bg-background min-h-[42px]">
      {tags.map((tag, index) => (
        <Tag
          key={index}
          variant={getTagColor(tag)}
          onRemove={() => handleRemoveTag(index)}
        >
          {tag}
        </Tag>
      ))}
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => inputValue && handleAddTag(inputValue)}
        placeholder={tags.length < maxTags ? placeholder : `최대 ${maxTags}개 태그까지 가능합니다`}
        disabled={disabled || tags.length >= maxTags}
        className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-w-[120px] h-6 p-0 text-sm"
      />
    </div>
  );
}