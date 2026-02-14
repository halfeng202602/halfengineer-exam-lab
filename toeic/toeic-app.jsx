import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'toeic-reading-progress-v2';

const TOEICApp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeMessage, setCodeMessage] = useState(null);

  const [progress, setProgress] = useState(null);

  const initialData = {
    parts: {
      5: { answered: 0, correct: 0 },
      6: { answered: 0, correct: 0 },
      7: { answered: 0, correct: 0 },
    },
    skills: {
      vocab: { answered: 0, correct: 0 },
      grammar: { answered: 0, correct: 0 },
      read: { answered: 0, correct: 0 },
      infer: { answered: 0, correct: 0 },
    },
    history: [],
    lastUpdated: null,
  };

  // 7パートのマスターデータ
  const partsMaster = [
    { id: 5, name: '短文穴埋め', fullName: 'Part5 短文穴埋め', section: 'R', questions: 30, color: '#69DB7C' },
    { id: 6, name: '長文穴埋め', fullName: 'Part6 長文穴埋め', section: 'R', questions: 16, color: '#4ECDC4' },
    { id: 7, name: '読解問題', fullName: 'Part7 読解問題', section: 'R', questions: 54, color: '#45B7D1' },
  ];

  // スキルのマスターデータ
  const skillsMaster = [
    { id: 'vocab', name: '語彙', icon: '📖' },
    { id: 'grammar', name: '文法', icon: '✏️' },
    { id: 'read', name: '読解', icon: '📄' },
    { id: 'infer', name: '推論', icon: '🔍' },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          setProgress(JSON.parse(result.value));
        } else {
          setProgress(initialData);
        }
      } catch (e) {
        console.log('Starting fresh');
        setProgress(initialData);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const saveProgress = async (newProgress) => {
    const dataToSave = { ...newProgress, lastUpdated: new Date().toISOString() };
    setProgress(dataToSave);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to save:', e);
    }
  };

  // 記録コードを解析して保存（複数対応）
  // フォーマット: P5-GRAMMAR-OK, P3-LISTEN-NG, P7-OK
  const processCode = async () => {
    const input = codeInput.trim().toUpperCase();
    if (!input) return;

    const codes = input.split(/[,\s\n]+/).filter(c => c);

    let successCount = 0;
    let errorMessages = [];
    const newProgress = JSON.parse(JSON.stringify(progress));

    for (const code of codes) {
      const match = code.match(/^P(\d)-(?:([A-Z]+)-)?([A-Z]+)$/);

      if (!match) {
        errorMessages.push(`${code}: 形式エラー`);
        continue;
      }

      const partId = parseInt(match[1]);
      const skillCode = match[2]?.toLowerCase();
      const result = match[3];

      if (partId < 5 || partId > 7) {
        errorMessages.push(`${code}: Partは5-7`);
        continue;
      }

      const validSkills = skillsMaster.map(s => s.id);
      const skillId = skillCode && validSkills.includes(skillCode) ? skillCode : null;

      if (result !== 'OK' && result !== 'NG') {
        errorMessages.push(`${code}: OKかNGで`);
        continue;
      }

      const isCorrect = result === 'OK';

      newProgress.parts[partId].answered += 1;
      if (isCorrect) newProgress.parts[partId].correct += 1;

      if (skillId) {
        newProgress.skills[skillId].answered += 1;
        if (isCorrect) newProgress.skills[skillId].correct += 1;
      }

      newProgress.history.push({
        timestamp: new Date().toISOString(),
        partId,
        skillId,
        isCorrect,
      });

      successCount++;
    }

    if (successCount > 0) {
      await saveProgress(newProgress);
    }

    if (errorMessages.length > 0) {
      setCodeMessage({
        type: successCount > 0 ? 'warning' : 'error',
        text: `${successCount}件記録 / エラー: ${errorMessages.join(', ')}`
      });
    } else {
      setCodeMessage({
        type: 'success',
        text: `✓ ${successCount}件 記録完了！`
      });
    }

    setCodeInput('');
    setTimeout(() => setCodeMessage(null), 4000);
  };

  const recordResult = async (isCorrect) => {
    if (!selectedPart) return;

    const newProgress = JSON.parse(JSON.stringify(progress));

    newProgress.parts[selectedPart].answered += 1;
    if (isCorrect) newProgress.parts[selectedPart].correct += 1;

    if (selectedSkill) {
      newProgress.skills[selectedSkill].answered += 1;
      if (isCorrect) newProgress.skills[selectedSkill].correct += 1;
    }

    newProgress.history.push({
      timestamp: new Date().toISOString(),
      partId: selectedPart,
      skillId: selectedSkill,
      isCorrect,
    });

    await saveProgress(newProgress);
    setShowRecordModal(false);
    setSelectedPart(null);
    setSelectedSkill(null);
  };

  const calcStats = () => {
    if (!progress) return { totalAnswered: 0, totalCorrect: 0, rate: 0 };
    let totalAnswered = 0, totalCorrect = 0;

    Object.entries(progress.parts).forEach(([id, d]) => {
      totalAnswered += d.answered;
      totalCorrect += d.correct;
    });

    const rate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    return { totalAnswered, totalCorrect, rate };
  };

  const stats = calcStats();
  const targetRate = 70;
  const targetQuestions = 100;

  const getScoreColor = (rate) => {
    if (rate >= 85) return '#4ECDC4';
    if (rate >= 70) return '#69DB7C';
    if (rate >= 50) return '#FFD43B';
    return '#FF6B6B';
  };

  // 弱点パートを取得
  const getWeakParts = () => {
    if (!progress) return [];
    return partsMaster
      .map(p => ({
        ...p,
        ...progress.parts[p.id],
        rate: progress.parts[p.id].answered > 0
          ? Math.round((progress.parts[p.id].correct / progress.parts[p.id].answered) * 100)
          : null
      }))
      .filter(p => p.rate !== null && p.rate < 70)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3);
  };

  const RadialProgress = ({ value, size = 150, strokeWidth = 10, color }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
    );
  };

  const resetData = async () => {
    if (confirm('本当にすべてのデータをリセットしますか？')) {
      await saveProgress(initialData);
    }
  };

  if (isLoading || !progress) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:'16px' }}>⏳</div>
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: '#fff',
      fontFamily: "'Noto Sans JP', -apple-system, sans-serif",
      padding: '16px',
      boxSizing: 'border-box',
    }}>
      {/* ヘッダー */}
      <div style={{ textAlign:'center', marginBottom:'20px' }}>
        <h1 style={{
          fontSize: '1.6rem',
          fontWeight: '800',
          background: 'linear-gradient(90deg, #FF8E72, #FFD43B, #4ECDC4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 4px 0',
        }}>
          TOEIC Reading ダッシュボード
        </h1>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', margin:0 }}>
          {progress.lastUpdated ? `最終: ${new Date(progress.lastUpdated).toLocaleString('ja-JP')}` : '新規'}
        </p>
      </div>

      {/* 記録ボタン */}
      <div style={{ marginBottom:'20px' }}>
        <button
          onClick={() => setShowRecordModal(true)}
          style={{
            width:'100%', padding:'16px', borderRadius:'14px', border:'none',
            background:'linear-gradient(135deg, #FF8E72, #FFD43B)',
            color:'#1a1a2e', fontWeight:'700', fontSize:'1rem', cursor:'pointer',
            boxShadow:'0 4px 15px rgba(255,142,114,0.3)',
          }}>
          ＋ 結果を記録する
        </button>
      </div>

      {/* 記録コード入力 */}
      <div style={{ marginBottom:'16px' }}>
        <div style={{
          background:'rgba(255,255,255,0.03)',
          borderRadius:'12px',
          padding:'12px',
          border:'1px solid rgba(255,255,255,0.08)',
        }}>
          <textarea
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={"記録コードを貼り付け\n例: P5-GRAMMAR-OK, P7-READ-NG\nカンマ/スペース/改行で複数OK"}
            rows={2}
            style={{
              width:'100%', padding:'10px', borderRadius:'8px', border:'none',
              background:'rgba(255,255,255,0.05)', color:'#fff',
              fontSize:'0.85rem', outline:'none', resize:'none',
              boxSizing:'border-box', fontFamily:'inherit',
            }}
          />
          <button
            onClick={processCode}
            style={{
              width:'100%', marginTop:'8px',
              padding:'12px', borderRadius:'8px', border:'none',
              background:'linear-gradient(135deg, #FF8E72, #FFD43B)',
              color:'#1a1a2e', fontWeight:'700', cursor:'pointer',
              fontSize:'0.9rem',
            }}>
            📥 記録する
          </button>
        </div>
        {codeMessage && (
          <div style={{
            marginTop:'8px', padding:'10px 14px', borderRadius:'8px',
            background: codeMessage.type === 'success' ? 'rgba(78,205,196,0.15)'
              : codeMessage.type === 'warning' ? 'rgba(255,212,59,0.15)'
              : 'rgba(255,107,107,0.15)',
            color: codeMessage.type === 'success' ? '#4ECDC4'
              : codeMessage.type === 'warning' ? '#FFD43B'
              : '#FF6B6B',
            fontSize:'0.8rem', textAlign:'center',
          }}>
            {codeMessage.text}
          </div>
        )}
      </div>

      {/* タブ */}
      <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginBottom:'20px', flexWrap:'wrap' }}>
        {[
          { id:'overview', label:'総合', icon:'📊' },
          { id:'parts', label:'パート別', icon:'🎯' },
          { id:'skills', label:'スキル', icon:'⚙️' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding:'10px 20px', borderRadius:'10px', border:'none',
              background: activeTab === tab.id ? 'linear-gradient(135deg,#FF8E72,#FFD43B)' : 'rgba(255,255,255,0.05)',
              color: activeTab === tab.id ? '#1a1a2e' : 'rgba(255,255,255,0.7)',
              fontWeight:'600', cursor:'pointer', fontSize:'0.85rem',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 総合タブ */}
      {activeTab === 'overview' && (
        <div style={{ maxWidth:'500px', margin:'0 auto' }}>
          {/* メインスコア */}
          <div style={{
            background:'rgba(255,255,255,0.03)', borderRadius:'20px', padding:'24px',
            textAlign:'center', border:'1px solid rgba(255,255,255,0.08)', marginBottom:'16px',
          }}>
            <div style={{ position:'relative', display:'inline-block' }}>
              <RadialProgress value={stats.rate} color={getScoreColor(stats.rate)} />
              <div style={{
                position:'absolute', top:'50%', left:'50%',
                transform:'translate(-50%,-50%)', textAlign:'center',
              }}>
                <div style={{ fontSize:'2rem', fontWeight:'800' }}>{stats.rate}%</div>
                <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.5)' }}>正答率</div>
              </div>
            </div>
            <div style={{ marginTop:'16px' }}>
              <span style={{
                padding:'6px 14px', borderRadius:'16px',
                background: stats.rate >= targetRate ? 'rgba(78,205,196,0.2)' : 'rgba(255,107,107,0.2)',
                color: stats.rate >= targetRate ? '#4ECDC4' : '#FF6B6B',
                fontSize:'0.8rem', fontWeight:'600',
              }}>
                {stats.totalAnswered === 0 ? '問題を解こう！' : stats.rate >= targetRate ? '✓ 目標ライン到達' : `目標まで ${targetRate - stats.rate}%`}
              </span>
            </div>
          </div>

          {/* 進捗 */}
          <div style={{
            background:'rgba(255,255,255,0.03)', borderRadius:'16px', padding:'20px',
            border:'1px solid rgba(255,255,255,0.08)', marginBottom:'16px',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
              <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.9rem' }}>解答済み</span>
              <span style={{ fontWeight:'700' }}>{stats.totalAnswered} / {targetQuestions}</span>
            </div>
            <div style={{ height:'8px', background:'rgba(255,255,255,0.1)', borderRadius:'4px', overflow:'hidden' }}>
              <div style={{
                height:'100%', width:`${Math.min((stats.totalAnswered/targetQuestions)*100, 100)}%`,
                background:'linear-gradient(90deg,#FF8E72,#FFD43B)', borderRadius:'4px',
              }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'16px' }}>
              <div style={{ background:'rgba(78,205,196,0.1)', padding:'14px', borderRadius:'10px', textAlign:'center' }}>
                <div style={{ fontSize:'1.5rem', fontWeight:'700', color:'#4ECDC4' }}>{stats.totalCorrect}</div>
                <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>正解</div>
              </div>
              <div style={{ background:'rgba(255,107,107,0.1)', padding:'14px', borderRadius:'10px', textAlign:'center' }}>
                <div style={{ fontSize:'1.5rem', fontWeight:'700', color:'#FF6B6B' }}>{stats.totalAnswered - stats.totalCorrect}</div>
                <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>不正解</div>
              </div>
            </div>
          </div>

          {/* 弱点パート */}
          {getWeakParts().length > 0 && (
            <div style={{
              background:'rgba(255,255,255,0.03)', borderRadius:'16px', padding:'16px',
              border:'1px solid rgba(255,255,255,0.08)', marginBottom:'16px',
            }}>
              <h3 style={{ margin:'0 0 12px 0', fontSize:'0.9rem' }}>🎯 要強化</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {getWeakParts().map(p => (
                  <div key={p.id} style={{
                    display:'flex', alignItems:'center', gap:'10px',
                    padding:'10px 12px', background:`${p.color}15`, borderRadius:'8px',
                  }}>
                    <div style={{ flex:1, fontSize:'0.85rem' }}>{p.fullName}</div>
                    <div style={{ fontWeight:'700', color:p.color }}>{p.rate}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* リセット */}
          <div style={{ textAlign:'center' }}>
            <button onClick={resetData} style={{
              padding:'8px 16px', borderRadius:'8px', border:'1px solid rgba(255,107,107,0.3)',
              background:'transparent', color:'#FF6B6B', fontSize:'0.75rem', cursor:'pointer',
            }}>
              🗑️ リセット
            </button>
          </div>
        </div>
      )}

      {/* パート別タブ */}
      {activeTab === 'parts' && (
        <div style={{ maxWidth:'500px', margin:'0 auto' }}>
          <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)', marginBottom:'8px', fontWeight:'600' }}>
            📄 READING（Part 5-7）
          </div>
          {partsMaster.map(part => {
            const data = progress.parts[part.id];
            const rate = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : null;

            return (
              <div key={part.id}
                style={{
                  background:'rgba(255,255,255,0.03)', borderRadius:'12px', padding:'14px 16px',
                  border:'1px solid rgba(255,255,255,0.08)', marginBottom:'8px',
                  display:'flex', alignItems:'center', gap:'12px',
                }}>
                <div style={{
                  width:'36px', height:'36px', borderRadius:'8px',
                  background:`linear-gradient(135deg,${part.color}40,${part.color}20)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:'800', color:part.color, fontSize:'0.85rem', flexShrink:0,
                }}>P{part.id}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:'600', fontSize:'0.85rem' }}>{part.name}</div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.4)' }}>
                    {data.answered > 0 ? `${data.correct}/${data.answered}問` : '未回答'} ・ {part.questions}問
                  </div>
                </div>
                <div style={{
                  fontSize:'1.2rem', fontWeight:'700',
                  color: rate !== null ? getScoreColor(rate) : 'rgba(255,255,255,0.2)',
                  minWidth:'50px', textAlign:'right',
                }}>
                  {rate !== null ? `${rate}%` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* スキルタブ */}
      {activeTab === 'skills' && (
        <div style={{ maxWidth:'500px', margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            {skillsMaster.map(skill => {
              const data = progress.skills[skill.id];
              const rate = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : null;

              return (
                <div key={skill.id} style={{
                  background:'rgba(255,255,255,0.03)', borderRadius:'12px', padding:'16px',
                  border:'1px solid rgba(255,255,255,0.08)', textAlign:'center',
                }}>
                  <div style={{ fontSize:'1.8rem', marginBottom:'8px' }}>{skill.icon}</div>
                  <div style={{ fontWeight:'600', fontSize:'0.9rem', marginBottom:'4px' }}>{skill.name}</div>
                  <div style={{
                    fontSize:'1.3rem', fontWeight:'700',
                    color: rate !== null ? getScoreColor(rate) : 'rgba(255,255,255,0.2)',
                  }}>
                    {rate !== null ? `${rate}%` : '—'}
                  </div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.4)' }}>
                    {data.answered > 0 ? `${data.correct}/${data.answered}` : '未回答'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 記録モーダル */}
      {showRecordModal && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:'16px',
        }} onClick={() => setShowRecordModal(false)}>
          <div style={{
            background:'linear-gradient(135deg, #1a1a2e, #16213e)',
            borderRadius:'20px', padding:'24px', maxWidth:'400px', width:'100%',
            border:'1px solid rgba(255,255,255,0.1)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin:'0 0 20px 0', fontSize:'1.2rem', textAlign:'center' }}>📝 結果を記録</h2>

            {/* パート選択 */}
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', marginBottom:'8px' }}>Part（必須）</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'6px' }}>
                {partsMaster.map(p => (
                  <button key={p.id} onClick={() => setSelectedPart(p.id)}
                    style={{
                      padding:'10px 4px', borderRadius:'8px', border:'none',
                      background: selectedPart === p.id ? p.color : 'rgba(255,255,255,0.05)',
                      color: selectedPart === p.id ? '#1a1a2e' : 'rgba(255,255,255,0.7)',
                      fontWeight:'600', cursor:'pointer', fontSize:'0.75rem',
                    }}>
                    P{p.id}
                  </button>
                ))}
              </div>
              {selectedPart && (
                <div style={{ marginTop:'8px', fontSize:'0.8rem', color: partsMaster.find(p => p.id === selectedPart).color }}>
                  → {partsMaster.find(p => p.id === selectedPart).fullName}
                </div>
              )}
            </div>

            {/* スキル選択 */}
            <div style={{ marginBottom:'20px' }}>
              <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', marginBottom:'8px' }}>スキル（任意）</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'6px' }}>
                {skillsMaster.map(skill => (
                  <button key={skill.id} onClick={() => setSelectedSkill(selectedSkill === skill.id ? null : skill.id)}
                    style={{
                      padding:'8px 4px', borderRadius:'8px', border:'none',
                      background: selectedSkill === skill.id ? '#FFD43B' : 'rgba(255,255,255,0.05)',
                      color: selectedSkill === skill.id ? '#1a1a2e' : 'rgba(255,255,255,0.7)',
                      fontWeight:'500', cursor:'pointer', fontSize:'0.7rem',
                    }}>
                    {skill.icon}
                  </button>
                ))}
              </div>
              {selectedSkill && (
                <div style={{ marginTop:'8px', fontSize:'0.8rem', color:'#FFD43B' }}>
                  → {skillsMaster.find(s => s.id === selectedSkill).name}
                </div>
              )}
            </div>

            {/* 正解/不正解ボタン */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <button
                onClick={() => recordResult(true)}
                disabled={!selectedPart}
                style={{
                  padding:'16px', borderRadius:'12px', border:'none',
                  background: selectedPart ? '#4ECDC4' : 'rgba(255,255,255,0.1)',
                  color: selectedPart ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
                  fontWeight:'700', fontSize:'1rem', cursor: selectedPart ? 'pointer' : 'not-allowed',
                }}>
                ⭕ 正解
              </button>
              <button
                onClick={() => recordResult(false)}
                disabled={!selectedPart}
                style={{
                  padding:'16px', borderRadius:'12px', border:'none',
                  background: selectedPart ? '#FF6B6B' : 'rgba(255,255,255,0.1)',
                  color: selectedPart ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontWeight:'700', fontSize:'1rem', cursor: selectedPart ? 'pointer' : 'not-allowed',
                }}>
                ❌ 不正解
              </button>
            </div>

            <button onClick={() => setShowRecordModal(false)}
              style={{
                width:'100%', marginTop:'12px', padding:'12px', borderRadius:'10px',
                border:'1px solid rgba(255,255,255,0.1)', background:'transparent',
                color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'0.85rem',
              }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* フッター */}
      <div style={{ textAlign:'center', marginTop:'24px', color:'rgba(255,255,255,0.2)', fontSize:'0.65rem' }}>
        TOEIC is a registered trademark of ETS.
      </div>
    </div>
  );
};

export default TOEICApp;
