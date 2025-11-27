// export.ts: 파일 다운로드 유틸리티

/**
 * JSON 데이터를 파일로 다운로드합니다.
 * @param jsonString - 다운로드할 JSON 문자열
 * @param filename - 파일명 (확장자 포함)
 */
export function downloadJsonFile(jsonString: string, filename: string): void {
  try {
    // Blob 객체 생성
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // URL 생성
    const url = URL.createObjectURL(blob);
    
    // 다운로드 링크 생성
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // DOM에 추가하고 클릭 후 제거
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // URL 해제
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('파일 다운로드 중 오류 발생:', error);
    throw new Error('파일 다운로드에 실패했습니다.');
  }
}

/**
 * 방 상태를 JSON 파일로 다운로드합니다.
 * @param jsonString - 직렬화된 방 상태 JSON 문자열
 * @param roomName - 방 이름 (파일명에 사용)
 */
export function downloadRoomStateFile(jsonString: string, roomName: string): void {
  // 파일명 생성: 방이름_날짜시간.json
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim() || '방';
  const filename = `${sanitizedRoomName}_${timestamp}.json`;
  
  downloadJsonFile(jsonString, filename);
}

