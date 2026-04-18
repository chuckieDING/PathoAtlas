'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import FeatureGuide, { type GuideStep } from './FeatureGuide';
import { useGuide } from './useGuide';

const GUIDE_STEPS: GuideStep[] = [
  {
    target: '[data-guide="hero"]',
    title: '欢迎来到 PathoAtlas',
    description: '全面、结构化、可交互的病理学个人学习平台。让我们快速了解各功能模块。',
    position: 'bottom',
  },
  {
    target: '[data-guide="core-modules"]',
    title: '四大核心学习模块',
    description: '病理图谱浏览疾病形态学，标记物数据库查阅免疫组化，鉴别诊断训练临床思维，复习测验巩固记忆。',
    position: 'top',
  },
  {
    target: '[data-guide="specialty-modules"]',
    title: '九大专项工具',
    description: '覆盖分子病理、细胞病理、冰冻切片、取材规范、CAP 报告、IHC 组合构建器等专业领域。',
    position: 'top',
  },
  {
    target: '[data-guide="search"]',
    title: '全局搜索',
    description: '快速查找任何疾病、标记物或鉴别诊断场景。支持中英文关键词。',
    position: 'bottom',
  },
  {
    target: '[data-guide="progress"]',
    title: '学习进度与成就',
    description: '每次学习都会积累经验值、提升等级。连续学习获得连击奖励，解锁成就徽章。',
    position: 'bottom',
  },
  {
    target: '[data-guide="user-avatar"]',
    title: '个人中心',
    description: '查看账号信息、管理收藏与笔记。你的所有学习数据都安全地存储在云端。',
    position: 'left',
  },
];

export function HomeGuide() {
  return (
    <Suspense fallback={null}>
      <HomeGuideInner />
    </Suspense>
  );
}

function HomeGuideInner() {
  const { shouldShow, completeGuide, skipGuide, startGuide } = useGuide();
  const searchParams = useSearchParams();

  // Handle ?guide=1 URL param (from Navbar redirect)
  useEffect(() => {
    if (searchParams.get('guide') === '1') {
      startGuide();
      // Clean up URL param without reload
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, startGuide]);

  if (!shouldShow) return null;

  return (
    <FeatureGuide
      steps={GUIDE_STEPS}
      onComplete={completeGuide}
      onSkip={skipGuide}
    />
  );
}
