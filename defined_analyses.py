import os
import io
from PIL import Image
from guitarsounds.analysis import Plot, Signal, Sound, SoundPack
import matplotlib.pyplot as plt
import streamlit as st
import scipy.io


def plot_with_sound(fun):
    """ Call the analyses with sound as argument """
    def new_fun(sound):
        fun(sound.signal.plot)
    return new_fun

def plot_with_soundpack(fun):
    """ Call the analyses with soundpack as argument """
    def new_fun(soundpack):
        for sound in soundpack.sounds:
            fun(sound.signal.normalize().plot, label=sound.name)
        plt.gca().legend()
    return new_fun

def load_md(md_file):
    with open(md_file) as f:
        content = f.read()
    return content

def streamlit_listen_freq_bins(sound):
    """ 
    listen freq bin function redefined to
    work with the streamlit framework 
    Creates audio elements with names, media player 
    and download button for each frequency bin signal
    in a guitarsounds.Sound instance
    """
    translated_bins = {'bass':'Basses',
                       'mid':'Mids',
                       'highmid':'High-Mids',
                       'uppermid':'Upper-Mids',
                       'presence':'Présence',
                       'brillance':'Brillance'}
    for key in sound.bins:
        c = st.container()
        colname, colaudio, coldownload = c.columns([1, 3.5, 0.5])
        colname.write(translated_bins[key])
        colaudio.audio(sound.bins[key].signal, sample_rate=sound.signal.sr)
        # Define the file content
        bytes_wav = bytes()
        byte_io = io.BytesIO(bytes_wav)
        scipy.io.wavfile.write(byte_io, 
                               sound.bins[key].sr, 
                               sound.bins[key].signal)
        file_bytes = byte_io.read()
        coldownload.download_button(label=':arrow_down:',
                                    data=file_bytes,
                                    file_name=f'{sound.name}_{key}.wav',)
    
single_sound_analysis_names = {'signal':'Tracer la courbe du son',
                               'envelope':"Tracer l'enveloppe du signal",
                               'logenv':"Tracer l'enveloppe logarithmique du signal",
                               'fft':'Tracer le spectre fréquentiel du son (FFT)',
                               'ffthist':"Tracer l'histogramme du spectre fréquentiel (FFT)",
                               'peaks':"Visualiser les pics du spectre fréquentiel (FFT)",
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
                                   'listenband':streamlit_listen_freq_bins,
                                   'plotband':Sound.plot_freq_bins,
                                   'histband':Sound.bin_hist}

single_sound_analysis_help = {'signal':load_md(os.path.join('documentation', 'signal.md')),
                              'envelope':load_md(os.path.join('documentation', 'envelope.md')),
                              'logenv':load_md(os.path.join('documentation', 'logenvelope.md')),
                              'fft':'TODO',
                              'ffthist':'TODO',
                              'peaks':'TODO',
                              'timedamp':'TODO',
                              'listenband':'TODO',
                              'plotband':'TODO',
                              'histband':'TODO'}

single_sound_analysis_help_figures = {'signal':Image.open(os.path.join('documentation', 'figures', 'signal.png')),
                                      'envelope':Image.open(os.path.join('documentation', 'figures', 'envelope.png')),
                                      'logenv':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                      'fft':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                      'ffthist':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                      'peaks':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                      'timedamp':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                      'listenband':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                      'plotband':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                      'histband':Image.open(os.path.join('documentation', 'figures', 'placeholder.png'))}

""" 
Pre-defined analyses for dual soundpacks (n = 2)
"""
dual_sound_analysis_names = {'msignal':'Tracer la courbe des sons',
                             'menvelope':"Tracer l'enveloppe des sons",
                             'mlogenv':"Tracer l'enveloppe logarithmique des sons",
                             'mfft':'Tracer le spectre fréquentiel des sons (FFT)',
                             'mffthist':"Tracer l'histogramme du spectre fréquentiel des sons (FFT)",
                             'fftmirror':'Comparer les spectres fréquentiels en configuration mirroir (FFT)',
                             'fftdiff':'Visualiser la différence entre les spectres fréquentiels (FFT)',
                             'peakcomp':'Comparer les pics du spectre fréquentiel (FFT)',
                             'fbinplot':'Tracer les bandes de fréquence',
                             'binhist':'Histogramme des bandes de fréquences',
                             'binpower':'Comparer la puissance des bandes de fréquence'}


dual_sound_analysis_functions = {'msignal':plot_with_soundpack(Plot.signal),
                                 'menvelope':plot_with_soundpack(Plot.envelope),
                                 'mlogenv':plot_with_soundpack(Plot.log_envelope),
                                 'mfft':plot_with_soundpack(Plot.fft),
                                 'mffthist':plot_with_soundpack(Plot.fft_hist),
                                 'peakcomp': SoundPack.compare_peaks,
                                 'fftmirror': SoundPack.fft_mirror,
                                 'fftdiff': SoundPack.fft_diff,
                                 'binpower': SoundPack.integral_plot,
                                 'binhist': SoundPack.bin_power_hist,
                                 'fbinplot': SoundPack.freq_bin_plot,}

dual_sound_analysis_help = {'msignal':load_md(os.path.join('documentation', 'signal.md')),                             
                            'menvelope':load_md(os.path.join('documentation', 'envelope.md')),                             
                            'mlogenv':'TODO',
                            'mfft':'TODO',
                            'mffthist':'TODO',
                            'peakcomp': 'TODO',
                            'fftmirror': 'TODO',
                            'fftdiff': 'TODO',
                            'binpower': 'TODO',
                            'binhist': 'TODO',
                            'fbinplot': 'TODO',}

dual_sound_analysis_help_figures = {'msignal':Image.open(os.path.join('documentation', 'figures', 'signal.png')),
                                    'menvelope':Image.open(os.path.join('documentation', 'figures', 'envelope.png')),
                                    'mlogenv':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                    'mfft':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                    'mffthist':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                    'peakcomp':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                    'fftmirror':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                    'fftdiff':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                    'binpower':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                    'binhist':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                    'fbinplot':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),}

""" 
Defined analyses for multiple sounds case (n > 2)
"""

# Pre determined analyses for multiple sounds
multi_sound_analysis_names = {'msignal':'Tracer la courbe des sons',
                              'menvelope':"Tracer l'enveloppe des sons",
                              'mlogenv':"Tracer l'enveloppe logarithmique des sons",
                              'mfft':'Tracer le spectre fréquentiel des sons (FFT)',
                              'mffthist':"Tracer l'histogramme du spectre fréquentiel des sons (FFT)",
                              'mfbinplot':'Tracer les bandes de fréquence',
                              'mbinpower':'Comparer la puissance des bandes de fréquence',
                              'mbinhist':'Histogramme des bandes de fréquences',}

multi_sound_analysis_functions  = {'msignal':plot_with_soundpack(Plot.signal),
                                   'menvelope':plot_with_soundpack(Plot.envelope),
                                   'mlogenv':plot_with_soundpack(Plot.log_envelope),
                                   'mfft':plot_with_soundpack(Plot.fft),
                                   'mffthist':plot_with_soundpack(Plot.fft_hist),
                                   'mfbinplot':SoundPack.freq_bin_plot,
                                   'mbinpower':SoundPack.integral_plot,
                                   'mbinhist':SoundPack.bin_power_hist,}

multi_sound_analysis_help = {'msignal':load_md(os.path.join('documentation', 'signal.md')),                             
                             'menvelope':load_md(os.path.join('documentation', 'envelope.md')),                             
                             'mlogenv':'TODO',
                             'mfft':'TODO',
                             'mffthist':'TODO',
                             'mfbinplot':'TODO',
                             'mbinpower':'TODO',
                             'mbinhist':'TODO',}

multi_sound_analysis_help_figures = {'msignal':Image.open(os.path.join('documentation', 'figures', 'signal.png')),
                                     'menvelope':Image.open(os.path.join('documentation', 'figures', 'envelope.png')),
                                     'mlogenv':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                     'mfft':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                     'mffthist':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                     'mfbinplot':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                     'mbinpower':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),
                                     'mbinhist':Image.open(os.path.join('documentation', 'figures', 'placeholder.png')),}


""" 
Defined headers for the .docx report generation
Should maybe be moved
"""
# Report headers corresponding to all the analyses
all_report_headers  = {'mfbinplot':'Amplitude des Bandes de fréquences selon le temps',
                       'mbinpower':'Puissance des bandes de fréquences selon le temps',
                       'mbinhist':"Histogramme de l'amplitude des bandes de fréquence",
                       'peakcomp':'Comparaison des pics du spectre fréquentiel (FFT) des deux sons',
                       'fftmirror':'Comparaison du spectre fréquentiel (FFT) de deux sons en mirroir',
                       'fftdiff':'Comparaison du spectre fréquentiel (FFT) de deux sons',
                       'binpower':'Comparaison de la puissance des bandes de fréquence',
                       'binhist':'Histogramme de la puissance des bandes de fréquence',
                       'fbinplot':'Graphique des bandes de fréquence',
                       'signal':'Courbe du signal selon le temps',
                       'msignal':'Courbe des sons selon le temps',
                       'envelope':"Enveloppe du signal selon le temps",
                       'menvelope':"Enveloppe des sons selon le temps",
                       'logenv':"Enveloppe logarithmique selon le temps",
                       'mlogenv':"Enveloppe logarithmique des sons selon le temps",
                       'fft':'Spectre fréquentiel du son (FFT)',
                       'mfft':'Spectre fréquentiel des sons (FFT)',
                       'ffthist':"Histogramme du spectre fréquentiel (FFT) du son",
                       'mffthist':"Histogramme du spectre fréquentiel (FFT) des sons",
                       'peaks':"Analyse des pics du spectre fréquentiel (FFT) du son",
                       'timedamp':"Amortissement temporel du son",
                       'plotband':"Graphique des bandes de fréquence du son",
                       'histband':"Histogramme des bandes de fréquence"}
