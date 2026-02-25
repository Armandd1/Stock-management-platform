import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { Boxes } from 'lucide-react';
import { ModeToggle } from '../components/mode-toggle';
import { useTranslation } from 'react-i18next';

export const Register: React.FC = () => {
  const { checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const registerSchema = z
    .object({
      name: z.string().min(2, { message: t('register.validation.name') }),
      email: z.string().email({ message: t('register.validation.email') }),
      password: z.string().min(6, { message: t('register.validation.password') }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('register.validation.passwordsMatch'),
      path: ['confirmPassword'],
    });

  type RegisterFormValues = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    try {
      await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      await checkAuth(); // Hydrates user state from API
      toast.success(t('register.toast.success'));
      navigate('/');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t('register.toast.failed'));
      toast.error(t('register.toast.failed'));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <ModeToggle />
      </div>
      <div className="mb-8 flex items-center gap-2">
        <div className="bg-primary p-2 rounded-lg shadow-sm">
          <Boxes className="text-primary-foreground h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Stockify</h1>
      </div>

      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-2 text-center pb-6 border-b border-border">
          <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('register.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('register.namePlaceholder')}
                {...register('name')}
                className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('login.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                {...register('email')}
                className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('login.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('register.passwordPlaceholder')}
                {...register('password')}
                className={
                  errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('register.confirmPasswordLabel')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('register.confirmPasswordPlaceholder')}
                {...register('confirmPassword')}
                className={
                  errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 font-medium">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" size="lg" disabled={isSubmitting}>
              {isSubmitting ? t('register.submitting') : t('register.submit')}
            </Button>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground mr-1">{t('register.haveAccount')}</span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t('register.loginLink')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
