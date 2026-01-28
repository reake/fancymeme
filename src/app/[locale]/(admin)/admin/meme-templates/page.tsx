import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getMemeTemplates,
  getMemeTemplatesCount,
  MemeTemplate,
  MemeTemplateStatus,
} from '@/shared/models/meme_template';
import { Button, Crumb } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function MemeTemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has permission to manage templates (using posts permission for now)
  await requirePermission({
    code: PERMISSIONS.POSTS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const { page: pageNum, pageSize, status } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  const t = await getTranslations('admin.meme-templates');

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.templates'), is_active: true },
  ];

  const total = await getMemeTemplatesCount({
    status: status || undefined,
  });

  const templates = await getMemeTemplates({
    status: status || undefined,
    page,
    limit,
  });

  const table: Table = {
    columns: [
      {
        name: 'imageUrl',
        title: t('fields.image'),
        type: 'image',
        metadata: {
          width: 100,
          height: 80,
        },
        className: 'rounded-md',
      },
      { name: 'name', title: t('fields.name') },
      { name: 'slug', title: t('fields.slug') },
      { name: 'category', title: t('fields.category') },
      {
        name: 'status',
        title: t('fields.status'),
        type: 'badge',
        callback: (item: MemeTemplate) => {
          const statusMap: Record<string, { label: string; variant: string }> = {
            active: { label: t('status.active'), variant: 'success' },
            pending: { label: t('status.pending'), variant: 'warning' },
            deleted: { label: t('status.deleted'), variant: 'destructive' },
          };
          return statusMap[item.status] || { label: item.status, variant: 'default' };
        },
      },
      {
        name: 'source',
        title: t('fields.source'),
        callback: (item: MemeTemplate) => {
          const sourceMap: Record<string, string> = {
            system: t('source.system'),
            user: t('source.user'),
            ai: t('source.ai'),
          };
          return sourceMap[item.source || 'system'] || item.source;
        },
      },
      { name: 'usageCount', title: t('fields.usage_count') },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: MemeTemplate) => {
          const actions = [
            {
              name: 'view',
              title: t('list.buttons.view'),
              icon: 'RiEyeLine',
              url: `/meme-editor?template=${item.slug}`,
              target: '_blank',
            },
          ];

          // Add approve/reject for pending templates
          if (item.status === MemeTemplateStatus.PENDING) {
            actions.unshift(
              {
                name: 'approve',
                title: t('list.buttons.approve'),
                icon: 'RiCheckLine',
                url: `/api/admin/meme-templates/${item.id}/approve`,
              },
              {
                name: 'reject',
                title: t('list.buttons.reject'),
                icon: 'RiCloseLine',
                url: `/api/admin/meme-templates/${item.id}/reject`,
              }
            );
          }

          return actions;
        },
      },
    ],
    data: templates,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const actions: Button[] = [
    {
      id: 'import',
      title: t('list.buttons.add'),
      icon: 'RiAddLine',
      url: '/admin/meme-templates/import',
    },
  ];

  // Add filter tabs
  const filterTabs = [
    { name: 'all', title: 'All', url: '/admin/meme-templates' },
    { name: 'active', title: t('status.active'), url: '/admin/meme-templates?status=active' },
    { name: 'pending', title: t('status.pending'), url: '/admin/meme-templates?status=pending' },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} actions={actions} />
        
        {/* Status filter tabs */}
        <div className="mb-4 flex gap-2">
          {filterTabs.map((tab) => (
            <a
              key={tab.name}
              href={tab.url}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                (status === tab.name) || (!status && tab.name === 'all')
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {tab.title}
            </a>
          ))}
        </div>

        <TableCard table={table} />
      </Main>
    </>
  );
}
