import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserWithPhotos } from "@/hooks/use-danceme";
import { useI18n } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, MapPin, Briefcase, Ruler, GraduationCap, Star, Cigarette, Wine, Dumbbell, Baby, Heart, Church, Vote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileDetailSheetProps {
  user: UserWithPhotos | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDetailSheet({ user, open, onOpenChange }: ProfileDetailSheetProps) {
  const { t } = useI18n();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Reset photo index when user changes
  useEffect(() => {
    if (user) {
      setCurrentPhotoIndex(0);
    }
  }, [user?.id]);

  const profile = user?.profile;
  const photos = user?.photos || [];
  const displayName = user?.firstName || "User";

  const nextPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  const getEducationLabel = (key: string) => {
    const educationMap: Record<string, string> = {
      highSchool: t.education.highSchool,
      someCollege: t.education.someCollege,
      bachelors: t.education.bachelors,
      masters: t.education.masters,
      doctorate: t.education.doctorate,
      tradeSchool: t.education.tradeSchool,
    };
    return educationMap[key] || key;
  };

  const getZodiacLabel = (key: string) => {
    const zodiacMap: Record<string, string> = {
      aries: t.zodiac.aries,
      taurus: t.zodiac.taurus,
      gemini: t.zodiac.gemini,
      cancer: t.zodiac.cancer,
      leo: t.zodiac.leo,
      virgo: t.zodiac.virgo,
      libra: t.zodiac.libra,
      scorpio: t.zodiac.scorpio,
      sagittarius: t.zodiac.sagittarius,
      capricorn: t.zodiac.capricorn,
      aquarius: t.zodiac.aquarius,
      pisces: t.zodiac.pisces,
    };
    return zodiacMap[key] || key;
  };

  const getLifestyleLabel = (key: string) => {
    const lifestyleMap: Record<string, string> = {
      never: t.lifestyle.never,
      sometimes: t.lifestyle.sometimes,
      regularly: t.lifestyle.regularly,
      socially: t.lifestyle.socially,
      active: t.lifestyle.active,
      daily: t.lifestyle.daily,
    };
    return lifestyleMap[key] || key;
  };

  const getChildrenLabel = (key: string) => {
    const childrenMap: Record<string, string> = {
      want: t.children.want,
      dontWant: t.children.dontWant,
      have: t.children.have,
      haveDone: t.children.haveDone,
      notSure: t.children.notSure,
    };
    return childrenMap[key] || key;
  };

  const getPetsLabel = (key: string) => {
    const petsMap: Record<string, string> = {
      dog: t.pets.dog,
      cat: t.pets.cat,
      both: t.pets.both,
      other: t.pets.other,
      want: t.pets.want,
      allergic: t.pets.allergic,
      none: t.pets.none,
    };
    return petsMap[key] || key;
  };

  const getReligionLabel = (key: string) => {
    const religionMap: Record<string, string> = {
      agnostic: t.religion.agnostic,
      atheist: t.religion.atheist,
      buddhist: t.religion.buddhist,
      catholic: t.religion.catholic,
      christian: t.religion.christian,
      hindu: t.religion.hindu,
      jewish: t.religion.jewish,
      muslim: t.religion.muslim,
      spiritual: t.religion.spiritual,
      other: t.religion.other,
    };
    return religionMap[key] || key;
  };

  const getPoliticsLabel = (key: string) => {
    const politicsMap: Record<string, string> = {
      liberal: t.politics.liberal,
      moderate: t.politics.moderate,
      conservative: t.politics.conservative,
      apolitical: t.politics.apolitical,
      other: t.politics.other,
    };
    return politicsMap[key] || key;
  };

  const getRelationshipTypeLabel = (key: string) => {
    const relationshipMap: Record<string, string> = {
      longTerm: t.relationshipTypes?.longTerm || "Long-term relationship",
      shortTerm: t.relationshipTypes?.shortTerm || "Something casual",
      friends: t.relationshipTypes?.friends || "New friends",
      figuring: t.relationshipTypes?.figuring || "Still figuring it out",
      marriage: t.relationshipTypes?.marriage || "Marriage",
    };
    return relationshipMap[key] || key;
  };

  const getInterestLabel = (key: string) => {
    const interestMap: Record<string, string> = {
      music: t.interests?.music || "Music",
      movies: t.interests?.movies || "Movies",
      travel: t.interests?.travel || "Travel",
      reading: t.interests?.reading || "Reading",
      sports: t.interests?.sports || "Sports",
      gaming: t.interests?.gaming || "Gaming",
      cooking: t.interests?.cooking || "Cooking",
      art: t.interests?.art || "Art",
      photography: t.interests?.photography || "Photography",
      dancing: t.interests?.dancing || "Dancing",
      fitness: t.interests?.fitness || "Fitness",
      yoga: t.interests?.yoga || "Yoga",
      hiking: t.interests?.hiking || "Hiking",
      beach: t.interests?.beach || "Beach",
      coffee: t.interests?.coffee || "Coffee",
      wine: t.interests?.wine || "Wine",
      foodie: t.interests?.foodie || "Foodie",
      fashion: t.interests?.fashion || "Fashion",
      tech: t.interests?.tech || "Technology",
      nature: t.interests?.nature || "Nature",
      pets: t.interests?.pets || "Pets",
      volunteering: t.interests?.volunteering || "Volunteering",
    };
    return interestMap[key] || key;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto p-0">
        {user ? (
          <div className="relative">
            <div className="relative h-[50vh] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentPhotoIndex}
                  src={photos[currentPhotoIndex]?.url || "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=60"}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid="img-profile-photo"
                />
              </AnimatePresence>
              
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
              
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur text-white"
                    data-testid="button-prev-photo"
                  >
                    <ChevronLeft size={24} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur text-white"
                    data-testid="button-next-photo"
                  >
                    <ChevronRight size={24} />
                  </Button>
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentPhotoIndex ? "bg-white w-4" : "bg-white/50"
                        }`}
                        data-testid={`button-photo-dot-${idx}`}
                      />
                    ))}
                  </div>
                </>
              )}

              <div className="absolute bottom-8 left-4 text-white">
                <h2 className="text-3xl font-bold" data-testid="text-profile-name">
                  {displayName}{profile?.age ? `, ${profile.age}` : ""}
                </h2>
              </div>
            </div>

          <div className="p-6 space-y-6">
            {profile?.bio && (
              <div>
                <p className="text-lg text-foreground">{profile.bio}</p>
              </div>
            )}

            {profile?.relationshipType && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails?.relationshipType || "Looking for"}</h3>
                <Badge variant="default" className="flex items-center gap-1 w-fit">
                  <Heart size={14} />
                  {getRelationshipTypeLabel(profile.relationshipType)}
                </Badge>
              </div>
            )}

            {profile?.interests && profile.interests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails?.interests || "Interests"}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string) => (
                    <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                      <Star size={14} />
                      {getInterestLabel(interest)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(profile?.birthplace || profile?.occupation || profile?.height || profile?.education || profile?.zodiacSign) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails.basics}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile?.birthplace && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <MapPin size={14} />
                      {profile.birthplace}
                    </Badge>
                  )}
                  {profile?.occupation && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Briefcase size={14} />
                      {profile.occupation}
                    </Badge>
                  )}
                  {profile?.height && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Ruler size={14} />
                      {profile.height} cm
                    </Badge>
                  )}
                  {profile?.education && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <GraduationCap size={14} />
                      {getEducationLabel(profile.education)}
                    </Badge>
                  )}
                  {profile?.zodiacSign && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star size={14} />
                      {getZodiacLabel(profile.zodiacSign)}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {(profile?.smoking || profile?.drinking || profile?.exercise) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails.lifestyle}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile?.smoking && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Cigarette size={14} />
                      {t.profileDetails.smoking}: {getLifestyleLabel(profile.smoking)}
                    </Badge>
                  )}
                  {profile?.drinking && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Wine size={14} />
                      {t.profileDetails.drinking}: {getLifestyleLabel(profile.drinking)}
                    </Badge>
                  )}
                  {profile?.exercise && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Dumbbell size={14} />
                      {t.profileDetails.exercise}: {getLifestyleLabel(profile.exercise)}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {(profile?.children || profile?.pets) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails.familyFuture}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile?.children && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Baby size={14} />
                      {getChildrenLabel(profile.children)}
                    </Badge>
                  )}
                  {profile?.pets && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Heart size={14} />
                      {getPetsLabel(profile.pets)}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {(profile?.religion || profile?.politics) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails.beliefs}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile?.religion && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Church size={14} />
                      {getReligionLabel(profile.religion)}
                    </Badge>
                  )}
                  {profile?.politics && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Vote size={14} />
                      {getPoliticsLabel(profile.politics)}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {photos.length > 1 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profile.photos}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentPhotoIndex ? "border-primary" : "border-transparent"
                      }`}
                      data-testid={`button-photo-thumbnail-${idx}`}
                    >
                      <img
                        src={photo.url}
                        alt={`${displayName} photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
