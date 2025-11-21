import React, { useState, useEffect } from 'react';
import { Pillar, Shelf } from '../types';

interface ObjectInfoPanelProps {
  selectedType: 'pillar' | 'shelf' | null;
  selectedId: string | null;
  pillar: Pillar | null;
  shelf: Shelf | null;
  pillars: Pillar[];
  onClose: () => void;
  onDelete: () => void;
}

export const ObjectInfoPanel: React.FC<ObjectInfoPanelProps> = ({
  selectedType,
  selectedId,
  pillar,
  shelf,
  pillars,
  onClose,
  onDelete,
}) => {
  // 선반 이미지 로드
  const [shelfImages, setShelfImages] = useState<{
    normal: HTMLImageElement | null;
    drawer: HTMLImageElement | null;
    hanger: HTMLImageElement | null;
  }>({
    normal: null,
    drawer: null,
    hanger: null,
  });

  useEffect(() => {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    Promise.all([
      loadImage(new URL('../images/pillar/일반_선반.png', import.meta.url).href),
      loadImage(new URL('../images/pillar/서랍_선반.png', import.meta.url).href),
      loadImage(new URL('../images/pillar/옷걸이_선반.png', import.meta.url).href),
    ]).then(([normalImg, drawerImg, hangerImg]) => {
      setShelfImages({
        normal: normalImg,
        drawer: drawerImg,
        hanger: hangerImg,
      });
    }).catch(console.error);
  }, []);

  const isPillar = selectedType === 'pillar' && pillar;
  const isShelf = selectedType === 'shelf' && shelf;
  const hasSelection = !!selectedType && !!selectedId && (isPillar || isShelf);

  // 선반 정보 계산
  let shelfInfo = null;
  if (isShelf && shelf) {
    const startPillar = pillars.find(p => p.id === shelf.startPillarId);
    const endPillar = pillars.find(p => p.id === shelf.endPillarId);
    if (startPillar && endPillar) {
      const lengthMm = Math.round(endPillar.xMm - startPillar.xMm);
      shelfInfo = {
        lengthMm,
        heightMm: Math.round(shelf.heightMm),
      };
    }
  }

  return (
    <div style={styles.panel}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h2 style={styles.title}>상품 정보</h2>
        {hasSelection && (
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        )}
      </div>

      {/* 이미지 영역 */}
      <div style={styles.imageArea}>
        {isPillar && (
          <div style={styles.pillarImage}>
            <div style={styles.pillarBar} />
          </div>
        )}
        {isShelf && shelf && (
          <div style={styles.shelfImage}>
            {(() => {
              const shelfType = shelf.type || 'normal';
              const shelfImage = shelfImages[shelfType];
              if (shelfImage && shelfImage.complete) {
                return (
                  <img
                    src={shelfImage.src}
                    alt={`${shelfType} 선반`}
                    style={styles.shelfImageElement}
                  />
                );
              }
              // 폴백: 기존 스타일
              return <div style={styles.shelfBar} />;
            })()}
          </div>
        )}
        {!hasSelection && (
          <div style={styles.placeholderImage}>
            <span style={styles.placeholderIcon}>ℹ️</span>
          </div>
        )}
      </div>

      {/* 제품명 */}
      <div style={styles.nameSection}>
        <h3 style={styles.name}>
          {isPillar ? '기둥 (Column)' : isShelf ? '선반 (Shelf)' : '오브젝트를 선택하세요'}
        </h3>
      </div>

      {/* 설명 */}
      <div style={styles.descriptionSection}>
        <p style={styles.description}>
          {isPillar
            ? '높이 조절이 가능한 시스템 행거 기둥입니다. 알루미늄 소재로 튼튼합니다.'
            : isShelf
              ? '시스템 선반입니다. 다양한 크기로 구성할 수 있습니다.'
              : '기둥 또는 선반을 클릭하면 상세 정보와 삭제 버튼이 표시됩니다.'}
        </p>
      </div>

      {/* ID */}
      {hasSelection && (
        <div style={styles.idSection}>
          <label style={styles.idLabel}>ID</label>
          <div style={styles.idValue}>{selectedId}</div>
        </div>
      )}

      {/* 추가 정보 */}
      {isPillar && pillar && (
        <div style={styles.infoSection}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>위치:</span>
            <span style={styles.infoValue}>{Math.round(pillar.xMm)}mm</span>
          </div>
        </div>
      )}

      {isShelf && shelfInfo && (
        <div style={styles.infoSection}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>길이:</span>
            <span style={styles.infoValue}>{shelfInfo.lengthMm}mm</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>높이:</span>
            <span style={styles.infoValue}>{shelfInfo.heightMm}mm</span>
          </div>
        </div>
      )}

      {/* 삭제 버튼 */}
      <div style={styles.footer}>
        <button
          style={{
            ...styles.deleteButton,
            opacity: hasSelection ? 1 : 0.4,
            cursor: hasSelection ? 'pointer' : 'not-allowed',
          }}
          onClick={hasSelection ? onDelete : undefined}
          disabled={!hasSelection}
        >
          <span style={styles.deleteIcon}>🗑️</span>
          <span>삭제하기</span>
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    width: '320px',
    height: '100%',
    backgroundColor: '#ffffff',
    boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#999',
    cursor: 'pointer',
    padding: 0,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  imageArea: {
    width: '100%',
    height: '200px',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  pillarImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarBar: {
    width: '60px',
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: '4px',
  },
  shelfImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelfBar: {
    width: '80%',
    height: '40px',
    backgroundColor: '#CD853F',
    borderRadius: '4px',
  },
  shelfImageElement: {
    width: '80%',
    height: 'auto',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '48px',
  },
  placeholderIcon: {
    fontSize: '48px',
  },
  nameSection: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  name: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  descriptionSection: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
  },
  idSection: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  idLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#999',
    marginBottom: '8px',
  },
  idValue: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    color: '#333',
    fontFamily: 'monospace',
  },
  infoSection: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#666',
  },
  infoValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '600',
  },
  footer: {
    padding: '20px',
    marginTop: 'auto',
  },
  deleteButton: {
    width: '100%',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#d32f2f',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background-color 0.2s',
  },
  deleteIcon: {
    fontSize: '18px',
  },
};

