// import.ts: 파일 읽기 유틸리티

/**
 * 파일을 텍스트로 읽어옵니다.
 * @param file - 읽을 파일 객체
 * @returns Promise<string> - 파일 내용 텍스트
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('파일을 읽을 수 없습니다.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * JSON 파일을 선택하는 함수
 * @param accept - 허용할 파일 확장자 (기본값: '.json')
 * @returns Promise<File> - 선택된 파일 객체
 */
export function selectJsonFile(accept: string = '.json'): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // JSON 파일인지 확인
        if (!file.name.toLowerCase().endsWith('.json')) {
          reject(new Error('JSON 파일만 선택할 수 있습니다.'));
          return;
        }
        resolve(file);
      } else {
        reject(new Error('파일이 선택되지 않았습니다.'));
      }
    };
    
    input.oncancel = () => {
      reject(new Error('파일 선택이 취소되었습니다.'));
    };
    
    input.click();
  });
}

/**
 * JSON 파일을 읽어서 텍스트로 반환합니다.
 * @returns Promise<string> - 파일 내용 JSON 문자열
 */
export async function importJsonFile(): Promise<string> {
  try {
    const file = await selectJsonFile();
    const text = await readFileAsText(file);
    return text;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('파일 불러오기에 실패했습니다.');
  }
}

