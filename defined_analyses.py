import os
from guitarsounds.analysis import Plot, Signal, Sound, SoundPack


def plot_with_sound(fun):
    """ Call the analyses with sound as argument """
    def new_fun(sound):
        fun(sound.signal.plot)
    return new_fun

def load_md(md_file):
    with open(md_file) as f:
        content = f.read()
    return content
    
single_sound_analysis_names = {'signal':'Tracer la courbe du son',
                               'envelope':"Tracer l'enveloppe du signal",
                               'logenv':"Tracer l'enveloppe logarithmique du signal",
                               'fft':'Tracer la transformée de Fourier du son',
                               'ffthist':"Tracer l'histogramme de la transformée de Fourier",
                               'peaks':"Visualiser les pics de la transformée de Fourier",
                               'timedamp':"Tracer l'amortissement temporel",
                               'listenband':"Écouter les bandes de fréquence",
                               'plotband':"Tracer les bandes de fréquence",
                               'histband':"Histogramme des bandes de fréquence"}

single_sound_analysis_functions = {'signal':plot_with_sound(Plot.signal),
                                   'envelope':plot_with_sound(Plot.envelope),
                                   'logenv':plot_with_sound(Plot.log_envelope),
                                   'fft':plot_with_sound(Plot.fft),
                                   'ffthist':plot_with_sound(Plot.fft_hist),
                                   'peaks':plot_with_sound(Plot.peaks),
                                   'timedamp':plot_with_sound(Plot.time_damping),
                                   'listenband':Sound.listen_freq_bins,
                                   'plotband':Sound.plot_freq_bins,
                                   'histband':Sound.bin_hist}

single_sound_analysis_help = {'signal':load_md(os.path.join('documentation', 'signal.md')),
                              'envelope':load_md(os.path.join('documentation', 'envelope.md')),
                              'logenv':'TODO',
                              'fft':'TODO',
                              'ffthist':'TODO',
                              'peaks':'TODO',
                              'timedamp':'TODO',
                              'listenband':'TODO',
                              'plotband':'TODO',
                              'histband':'TODO'}


