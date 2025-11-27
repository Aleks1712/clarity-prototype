import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { languages, LanguageCode } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
      <SelectTrigger className="w-[180px] h-12">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(languages).map(([code, { name, flag }]) => (
          <SelectItem key={code} value={code} className="cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="text-xl">{flag}</span>
              <span>{name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
